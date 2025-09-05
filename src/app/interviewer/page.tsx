
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useTimer } from 'use-timer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Video, VideoOff, Mic, RefreshCw, Check, Send, Loader2, Play, ChevronsRight, Bot, Star, ChevronDown, UserSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateQuestions } from '@/ai/flows/generate-questions-flow';
import { getInterviewFeedback, InterviewFeedbackInput } from '@/ai/flows/interview-feedback-flow';
import { textToSpeech } from '@/ai/flows/text-to-speech-flow';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const RESPONSE_TIME = 90; // seconds
const PREPARATION_TIME = 5; // seconds
const MAX_RETAKES = 2;

type InterviewState = 'idle' | 'generating' | 'preparing' | 'listening' | 'recording' | 'reviewing' | 'finished' | 'error';

const professions = [
    "Software Engineer",
    "Product Manager",
    "UX/UI Designer",
    "Data Scientist",
    "Marketing Manager",
    "Sales Representative",
];

interface Answer {
    question: string;
    videoUrl: string | null;
    transcript: string;
    blob: Blob | null;
}

export default function InterviewerPage() {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [interviewState, setInterviewState] = useState<InterviewState>('idle');
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [retakesLeft, setRetakesLeft] = useState(MAX_RETAKES);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedProfession, setSelectedProfession] = useState<string>(professions[0]);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  const { time: prepTime, start: startPrepTimer, reset: resetPrepTimer } = useTimer({
    initialTime: PREPARATION_TIME,
    timerType: 'DECREMENTAL',
    endTime: 0,
    onTimeOver: startRecording,
  });

  const { time: responseTime, start: startResponseTimer, pause: pauseResponseTimer, reset: resetResponseTimer } = useTimer({
    initialTime: RESPONSE_TIME,
    timerType: 'DECREMENTAL',
    endTime: 0,
    onTimeOver: () => interviewState === 'recording' && stopRecording(),
  });

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setHasCameraPermission(true);
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (error) {
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera and microphone permissions.',
        });
      }
    };
    getCameraPermission();

    // Setup SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setCurrentTranscript(prev => prev + finalTranscript);
      };
    }

    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [toast]);
  
  useEffect(() => {
      if (interviewState === 'listening' && audioRef.current) {
          audioRef.current.play();
      }
  }, [interviewState, currentAudio]);

  const getQuestionAudio = async (questionText: string) => {
      try {
          const { audio } = await textToSpeech(questionText);
          setCurrentAudio(audio);
          setInterviewState('listening');
      } catch (error) {
          console.error("TTS Error:", error);
          toast({ variant: 'destructive', title: 'Audio Error', description: 'Could not generate question audio. Starting recording anyway.'});
          startRecording(); // Fallback to just recording
      }
  }

  const handleStartInterview = async () => {
    setInterviewState('generating');
    setAnswers([]);
    setFeedback(null);
    try {
      const result = await generateQuestions({ profession: selectedProfession });
      setQuestions(result.questions);
      setCurrentQuestionIndex(0);
      getQuestionAudio(result.questions[0]);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not generate interview questions.' });
      setInterviewState('error');
    }
  };
  
  const handleAudioEnded = () => {
      setInterviewState('preparing');
      startPrepTimer();
  }

  function startRecording() {
    if (videoRef.current?.srcObject) {
      setInterviewState('recording');
      setRecordedChunks([]);
      setCurrentTranscript('');
      resetResponseTimer();
      startResponseTimer();
      
      const stream = videoRef.current.srcObject as MediaStream;
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current.ondataavailable = (event) => event.data.size > 0 && setRecordedChunks(prev => [...prev, event.data]);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setAnswers(prev => [...prev, { question: questions[currentQuestionIndex], videoUrl: url, transcript: currentTranscript, blob }]);
        setInterviewState('reviewing');
        pauseResponseTimer();
      };
      mediaRecorderRef.current.start();
      recognitionRef.current?.start();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'No camera stream available.' });
      setInterviewState('error');
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      recognitionRef.current?.stop();
    }
  };

  const handleRetake = () => {
    if (retakesLeft > 0) {
      setRetakesLeft(prev => prev - 1);
      setAnswers(prev => prev.slice(0, -1)); // Remove last attempt
      getQuestionAudio(questions[currentQuestionIndex]);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setRetakesLeft(MAX_RETAKES);
      getQuestionAudio(questions[nextIndex]);
    } else {
      finishInterview();
    }
  };

  const finishInterview = async () => {
    setInterviewState('generating'); // Show loading for feedback
    try {
        const feedbackInput: InterviewFeedbackInput = {
            profession: selectedProfession,
            questionsAndAnswers: answers.map(a => ({ question: a.question, answer: a.transcript }))
        };
        const result = await getInterviewFeedback(feedbackInput);
        setFeedback(result.feedback);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Feedback Error', description: 'Could not generate AI feedback.'});
    }
    setInterviewState('finished');
  };

  const restartInterview = () => {
      setInterviewState('idle');
      setQuestions([]);
      setAnswers([]);
      setFeedback(null);
      setCurrentQuestionIndex(0);
      setRetakesLeft(MAX_RETAKES);
      setCurrentAudio(null);
  }
  
  const renderInterviewerContent = () => {
    switch(interviewState) {
        case 'listening':
            return <div className="text-center"><h2 className="text-xl font-semibold mb-4">Listen to the question...</h2><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;
        case 'preparing':
            return <div className="text-center"><h2 className="text-xl font-semibold mb-4">Get Ready!</h2><p className="text-4xl font-bold">{prepTime}</p></div>;
        case 'recording':
            return <div className="text-center"><div className="text-2xl font-bold text-red-500 mb-2">Recording... {responseTime}s</div></div>;
        case 'reviewing':
             return (
                <div className="text-center space-y-4">
                    <h2 className="text-xl font-semibold">Review Your Answer</h2>
                </div>
            );
        default:
            return <div className="flex flex-col items-center justify-center text-center"><UserSquare className="h-24 w-24 text-muted-foreground mb-4" /><p className="text-muted-foreground">The interviewer will appear here.</p></div>
    }
  }

  const renderContent = () => {
    if (hasCameraPermission === false) return <Alert variant="destructive"><VideoOff className="h-4 w-4" /><AlertTitle>Camera Access Required</AlertTitle><AlertDescription>Please allow camera and microphone access.</AlertDescription></Alert>;
    if (hasCameraPermission === null) return <div className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /><span>Waiting for camera permission...</span></div>;

    switch (interviewState) {
        case 'idle':
            return (
                <div className="text-center">
                    <h2 className="text-xl font-semibold mb-4">Practice your interview skills</h2>
                    <p className="text-muted-foreground mb-6">Select a profession and answer AI-generated questions.</p>
                    <div className="flex justify-center items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">{selectedProfession} <ChevronDown className="ml-2 h-4 w-4"/></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {professions.map(p => <DropdownMenuItem key={p} onSelect={() => setSelectedProfession(p)}>{p}</DropdownMenuItem>)}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button onClick={handleStartInterview}>Start Interview</Button>
                    </div>
                </div>
            );
        case 'generating':
             return <div className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /><span>{feedback === null ? 'Generating questions...' : 'Generating feedback...'}</span></div>;
        case 'reviewing':
            const lastAnswerUrl = answers.length > 0 ? answers[answers.length - 1].videoUrl : null;
            return (
                 <div className="w-full">
                    <video key={lastAnswerUrl} src={lastAnswerUrl || ''} className="aspect-video w-full rounded-md bg-black" controls autoPlay loop />
                    <div className="flex gap-4 justify-center mt-4">
                        <Button onClick={handleRetake} disabled={retakesLeft === 0}><RefreshCw className="mr-2 h-4 w-4" />Retake ({retakesLeft} left)</Button>
                        <Button onClick={handleNextQuestion} variant="default"><Check className="mr-2 h-4 w-4" />{currentQuestionIndex === questions.length - 1 ? 'Finish & Get Feedback' : 'Submit & Next'}</Button>
                    </div>
                </div>
            );
        case 'finished':
            return (
                <div className="text-center">
                    <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold">Interview Complete!</h2>
                    <p className="text-muted-foreground mb-6">Review your answers and AI feedback below.</p>
                    <Button onClick={restartInterview}><RefreshCw className="mr-2 h-4 w-4" />Start New Interview</Button>
                </div>
            );
        case 'listening':
        case 'preparing':
        case 'recording':
            return (
                 <div className="aspect-video w-full bg-muted rounded-md overflow-hidden relative">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                    <div className="absolute top-2 right-2 flex items-center gap-2 bg-black/50 text-white text-xs p-1 rounded-md">
                        {hasCameraPermission ? <><Video className="h-4 w-4 text-green-500"/> ON</> : <><VideoOff className="h-4 w-4 text-red-500"/> OFF</> }
                    </div>
                    {interviewState === 'recording' && <Button onClick={stopRecording} variant="destructive" className="absolute bottom-4 left-1/2 -translate-x-1/2">Stop Recording</Button>}
                </div>
            );
        default: return <p>An unexpected error occurred.</p>;
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isInterviewActive = !['idle', 'generating', 'finished', 'error'].includes(interviewState);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      {currentAudio && <audio ref={audioRef} src={currentAudio} onEnded={handleAudioEnded} />}
      <div className="w-full max-w-6xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-headline">AI Interview Coach</CardTitle>
            <CardDescription>
              {isInterviewActive ? `Question ${currentQuestionIndex + 1} of ${questions.length}` : 'Follow the instructions to practice your interview.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {isInterviewActive && (
                 <div className="grid md:grid-cols-2 gap-6 items-center">
                    <Card className="bg-muted/50">
                        <CardContent className="p-6 flex items-center justify-center aspect-video">
                            <div className="relative w-48 h-48">
                               <Image src="https://picsum.photos/300/300" data-ai-hint="professional person" layout="fill" objectFit="cover" className="rounded-full" alt="Interviewer" />
                            </div>
                        </CardContent>
                    </Card>
                    <div className="aspect-video flex items-center justify-center">
                       {renderInterviewerContent()}
                    </div>
                </div>
            )}
            
            {currentQuestion && (
              <Card><CardContent className="p-4 text-center"><p className="font-semibold">{currentQuestion}</p></CardContent></Card>
            )}

            <div className={cn("flex items-center justify-center", !isInterviewActive ? "h-32" : "h-auto")}>
              {renderContent()}
            </div>
          </CardContent>
        </Card>

        {interviewState === 'finished' && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Star className="text-primary h-6 w-6"/> Your Results</CardTitle>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>
                                <div className="flex items-center gap-2"><Bot className="h-5 w-5"/> AI Feedback</div>
                            </AccordionTrigger>
                            <AccordionContent className="prose dark:prose-invert max-w-none">
                                {feedback ? <div dangerouslySetInnerHTML={{ __html: feedback.replace(/\n/g, '<br />') }} /> : 'No feedback available.'}
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                             <AccordionTrigger>
                                <div className="flex items-center gap-2"><Play className="h-5 w-5"/> Review Your Answers</div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-4">
                                {answers.map((answer, index) => (
                                    <div key={index} className="p-4 border rounded-lg">
                                        <h4 className="font-semibold mb-2">{`Question ${index + 1}: ${answer.question}`}</h4>
                                        {answer.videoUrl && (
                                            <video src={answer.videoUrl} controls className="w-full rounded-md mb-2 max-w-sm mx-auto" />
                                        )}
                                        <p className="text-sm text-muted-foreground italic p-2 bg-muted rounded-md">{answer.transcript || "No transcript captured."}</p>
                                    </div>
                                ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>
        )}

      </div>
    </div>
  );
}
