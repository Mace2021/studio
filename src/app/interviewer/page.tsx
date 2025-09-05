
'use client';

import { useState, useEffect, useRef } from 'react';
import { useTimer } from 'use-timer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Video, VideoOff, Mic, RefreshCw, Check, Send, Loader2, Play, ChevronsRight, Bot, Star, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateQuestions, GenerateQuestionsInput } from '@/ai/flows/generate-questions-flow';
import { getInterviewFeedback, InterviewFeedbackInput } from '@/ai/flows/interview-feedback-flow';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

const RESPONSE_TIME = 90; // seconds
const PREPARATION_TIME = 5; // seconds
const MAX_RETAKES = 2;

type InterviewState = 'idle' | 'generating' | 'preparing' | 'recording' | 'reviewing' | 'finished' | 'error';

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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const reviewVideoRef = useRef<HTMLVideoElement>(null);
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

  const handleStartInterview = async () => {
    setInterviewState('generating');
    setAnswers([]);
    setFeedback(null);
    try {
      const result = await generateQuestions({ profession: selectedProfession });
      setQuestions(result.questions);
      setInterviewState('preparing');
      setCurrentQuestionIndex(0);
      startPrepTimer();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not generate interview questions.' });
      setInterviewState('error');
    }
  };

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
      setInterviewState('preparing');
      setAnswers(prev => prev.slice(0, -1)); // Remove last attempt
      startPrepTimer();
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setRetakesLeft(MAX_RETAKES);
      setInterviewState('preparing');
      startPrepTimer();
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
        case 'preparing':
            return <div className="text-center"><h2 className="text-xl font-semibold mb-4">Get Ready!</h2><p className="text-4xl font-bold">{prepTime}</p></div>;
        case 'recording':
            return <div className="text-center"><div className="text-2xl font-bold text-red-500 mb-2">Recording... {responseTime}s</div><Button onClick={stopRecording} variant="destructive">Stop Recording</Button></div>;
        case 'reviewing':
            return (
                <div className="text-center space-y-4">
                    <h2 className="text-xl font-semibold">Review Your Answer</h2>
                    <div className="flex gap-4 justify-center">
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
        default: return <p>An unexpected error occurred.</p>;
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const lastAnswerUrl = answers.length > 0 ? answers[answers.length - 1].videoUrl : null;
  const isVideoVisible = interviewState !== 'finished' && interviewState !== 'idle';

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-5xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-headline">AI Interview Coach</CardTitle>
            <CardDescription>
              {interviewState !== 'idle' && interviewState !== 'finished' ? `Question ${currentQuestionIndex + 1} of ${questions.length}` : 'Follow the instructions to practice your interview.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isVideoVisible && (
              <div className="aspect-video w-full bg-muted rounded-md overflow-hidden relative">
                <video ref={videoRef} className={cn("w-full h-full object-cover transition-opacity", interviewState === 'reviewing' ? 'opacity-0' : 'opacity-100')} autoPlay muted playsInline />
                {interviewState === 'reviewing' && lastAnswerUrl && <video key={lastAnswerUrl} src={lastAnswerUrl} className="absolute inset-0 w-full h-full object-cover z-10" controls autoPlay loop />}
                <div className="absolute top-2 left-2 flex items-center gap-2 bg-black/50 text-white text-xs p-1 rounded-md">
                  {hasCameraPermission ? <><Video className="h-4 w-4 text-green-500"/> ON</> : <><VideoOff className="h-4 w-4 text-red-500"/> OFF</> }
                </div>
              </div>
            )}
            
            {interviewState !== 'idle' && interviewState !== 'finished' && (
              <Card><CardContent className="p-4 text-center"><p className="font-semibold">{currentQuestion}</p></CardContent></Card>
            )}

            <div className="h-24 flex items-center justify-center">
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
