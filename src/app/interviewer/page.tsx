
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useTimer } from 'use-timer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Video, VideoOff, RefreshCw, Check, Loader2, Play, Bot, Star, ChevronDown, UserSquare, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateQuestions } from '@/ai/flows/generate-questions-flow';
import { getInterviewFeedback, InterviewFeedbackInput } from '@/ai/flows/interview-feedback-flow';
import { textToSpeech } from '@/ai/flows/text-to-speech-flow';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const RESPONSE_TIME = 90; // seconds
const PREPARATION_TIME = 5; // seconds
const MAX_RETAKES = 2;

type InterviewState = 'idle' | 'generating' | 'listening' | 'preparing' | 'recording' | 'reviewing' | 'finished' | 'error';

const professions = [
    "Software Engineer",
    "Product Manager",
    "UX/UI Designer",
    "Data Scientist",
    "Marketing Manager",
    "Sales Representative",
    "Registered Nurse",
    "Physician Assistant",
    "Physical Therapist",
    "Accountant",
    "Financial Analyst",
    "Human Resources Manager",
    "Teacher",
    "Lawyer",
    "Graphic Designer",
    "Civil Engineer",
    "Mechanical Engineer",
    "Doctor",
    "Chef",
];

interface Answer {
    question: string;
    videoUrl: string | null;
    transcript: string;
    blob: Blob | null;
}

export default function InterviewerPage() {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [interviewState, setInterviewState] = useState<InterviewState>('idle');
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [retakesLeft, setRetakesLeft] = useState(MAX_RETAKES);
  
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedProfession, setSelectedProfession] = useState<string>(professions[0]);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const stopRecognitionOnPurpose = useRef(false);
  const { toast } = useToast();

  const { time: prepTime, start: startPrepTimer, reset: resetPrepTimer } = useTimer({
    initialTime: PREPARATION_TIME,
    timerType: 'DECREMENTAL',
    endTime: 0,
    onTimeOver: () => startRecording(),
  });

  const { time: responseTime, start: startResponseTimer, pause: pauseResponseTimer, reset: resetResponseTimer, status: responseTimerStatus } = useTimer({
    initialTime: RESPONSE_TIME,
    timerType: 'DECREMENTAL',
    endTime: 0,
    onTimeOver: () => {
      if (interviewState === 'recording') {
        stopRecording();
      }
    },
  });

  const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error: any) {
        console.error('Error accessing camera:', error);
        if (error.name === 'NotAllowedError') {
          setHasCameraPermission(false);
        }
        setIsCameraReady(false); // Explicitly set to false on any error
      }
  };

   useEffect(() => {
    getCameraPermission();

    // Check if SpeechRecognition is available and initialize it
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        if (!recognitionRef.current) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
    
            recognition.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                setCurrentTranscript(prev => prev.trim() ? `${prev} ${finalTranscript}` : finalTranscript);
            }
            };
            
            recognition.onend = () => {
              if (!stopRecognitionOnPurpose.current) {
                console.log("Speech recognition ended, restarting...");
                recognition.start();
              }
            }
            
            recognitionRef.current = recognition;
        }
    }


    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      if (recognitionRef.current) {
          stopRecognitionOnPurpose.current = true;
          recognitionRef.current.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  useEffect(() => {
      if (interviewState === 'listening' && currentAudio && audioRef.current) {
          audioRef.current.play().catch(e => {
              console.error("Audio play failed:", e);
              toast({ variant: 'destructive', title: 'Audio Playback Error', description: 'Could not play question audio. Please ensure your browser allows autoplay.' });
              handleAudioEnded();
          });
      }
  }, [interviewState, currentAudio, toast]);

  const getQuestionAudio = async (questionText: string) => {
    try {
        const result = await textToSpeech(questionText);
        if (result && result.audio) {
          setCurrentAudio(result.audio);
          setInterviewState('listening');
        } else {
           console.error("Audio generation failed:", result.error);
           toast({ 
              variant: 'default', 
              title: 'Audio Unavailable', 
              description: 'Could not generate question audio. Proceeding without it.'
           });
           handleAudioEnded(); // Proceed without audio
        }
    } catch (error) {
        console.error("TTS Error:", error);
        toast({ 
            variant: 'destructive', 
            title: 'Audio Generation Failed', 
            description: 'Could not generate question audio. The service may be busy. Starting interview without audio.'
        });
        handleAudioEnded();
    }
  }

  const handleStartInterview = async () => {
    if (!isCameraReady) {
      toast({ variant: 'destructive', title: 'Camera Not Ready', description: 'Please wait for camera to initialize before starting.'});
      return;
    }
    if (hasCameraPermission !== true) {
      toast({ variant: 'destructive', title: 'Camera Required', description: 'Please enable camera access before starting.'});
      getCameraPermission();
      return;
    }
    setInterviewState('generating');
    setAnswers([]);
    setFeedback(null);
    setCurrentQuestionIndex(0);
    setRetakesLeft(MAX_RETAKES);
    try {
      const result = await generateQuestions({ profession: selectedProfession });
      setQuestions(result.questions);
      getQuestionAudio(result.questions[0]);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not generate interview questions.' });
      setInterviewState('error');
    }
  };
  
  const handleAudioEnded = () => {
      setInterviewState('preparing');
      resetPrepTimer();
      startPrepTimer();
  }

  function startRecording() {
    if (!videoRef.current?.srcObject || !isCameraReady) {
      toast({ variant: 'destructive', title: 'Error', description: 'No camera stream available. Please refresh and grant permissions.' });
      setInterviewState('error');
      return;
    }
    setInterviewState('recording');
    setCurrentTranscript('');
    resetResponseTimer();
    startResponseTimer();
    
    const stream = videoRef.current.srcObject as MediaStream;
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (event) => {
        if(event.data.size > 0) {
            chunks.push(event.data)
        }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setAnswers(prev => [...prev, { question: questions[currentQuestionIndex], videoUrl: url, transcript: currentTranscript, blob }]);
      setInterviewState('reviewing');
      pauseResponseTimer();
    };
    
    mediaRecorderRef.current = recorder;
    mediaRecorderRef.current.start();
    if (recognitionRef.current) {
        stopRecognitionOnPurpose.current = false;
        recognitionRef.current.start();
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
        stopRecognitionOnPurpose.current = true;
        recognitionRef.current.stop();
    }
  };
  
  const handleStopClick = () => {
    if(responseTimerStatus === 'RUNNING') {
        stopRecording();
    }
  }

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
            questionsAndAnswers: answers.map(a => ({ question: a.question, answer: a.transcript || "No answer transcribed." }))
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
      // Reset camera state to trigger permission check if needed
      setHasCameraPermission(null);
      setIsCameraReady(false);
      getCameraPermission();
  }
  
  const renderInterviewerOverlay = () => {
    switch(interviewState) {
        case 'listening':
            return <div className="text-center"><h2 className="text-xl font-semibold mb-4">Listen to the question...</h2><Loader2 className="h-8 w-8 animate-spin mx-auto text-white" /></div>;
        case 'preparing':
            return <div className="text-center"><h2 className="text-xl font-semibold mb-4">Get Ready!</h2><p className="text-4xl font-bold">{prepTime}</p></div>;
        case 'recording':
            return <div className="text-center"><div className="text-2xl font-bold text-red-500 mb-2">Recording... {responseTime}s</div></div>;
        case 'reviewing':
             return (
                <div className="text-center space-y-4">
                    <h2 className="text-xl font-semibold">Answer Submitted!</h2>
                    <Check className="h-12 w-12 text-green-500 mx-auto" />
                </div>
            );
        case 'generating':
             return (
                 <div className="flex flex-col items-center justify-center text-center">
                    <Loader2 className="h-12 w-12 text-white animate-spin mb-4" />
                    <p className="text-white">{feedback === null ? 'Generating questions...' : 'Generating feedback...'}</p>
                 </div>
             );
        case 'finished':
             return (
                <div className="text-center space-y-4">
                    <h2 className="text-xl font-semibold">Interview Complete!</h2>
                    <Check className="h-12 w-12 text-green-500 mx-auto" />
                    <p>Well done! Review your results below.</p>
                </div>
            );
        default:
            return <div className="flex flex-col items-center justify-center text-center h-full"><UserSquare className="h-24 w-24 text-white/50 mb-4" /><p className="text-white/80">The interviewer will appear here.</p></div>
    }
  }

  const renderContent = () => {
    if (hasCameraPermission === false) return (
        <Alert variant="destructive">
            <VideoOff className="h-4 w-4" />
            <AlertTitle>Camera Access Required</AlertTitle>
            <AlertDescription>
              Please allow camera and microphone access to use this feature. 
              You may need to reload the page after granting permissions in your browser settings.
            </AlertDescription>
            <Button variant="secondary" size="sm" className="mt-4" onClick={getCameraPermission}>
                Try Again
            </Button>
        </Alert>
    );
    if (hasCameraPermission === null) return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /><span className="ml-2">Requesting camera access...</span></div>;

    if (interviewState === 'idle') return (
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
                <Button onClick={handleStartInterview} disabled={!isCameraReady}>
                    {!isCameraReady ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                    {isCameraReady ? 'Start Interview' : 'Camera Loading...'}
                </Button>
            </div>
        </div>
    );

    const lastAnswerUrl = answers.length > 0 ? answers[answers.length - 1].videoUrl : null;
    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div className="w-full space-y-4">
           <div className="aspect-video w-full bg-black rounded-lg overflow-hidden relative flex items-center justify-center">
               <motion.div
                    animate={{ scale: [1, 1.02, 1], transition: { duration: 5, repeat: Infinity, ease: "easeInOut" } }}
                    className="w-full h-full"
                >
                    <Image 
                        src="https://picsum.photos/1280/720"
                        data-ai-hint="professional person"
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover"
                        alt="Interviewer"
                    />
               </motion.div>
               <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 text-white">
                   {renderInterviewerOverlay()}
               </div>

               <div className="absolute bottom-4 right-4 h-1/4 aspect-video bg-black rounded-md overflow-hidden border-2 border-white/50">
                    <video ref={videoRef} onCanPlay={() => setIsCameraReady(true)} className={cn("w-full h-full object-cover transition-opacity", (interviewState === 'reviewing' && lastAnswerUrl) ? 'opacity-0' : 'opacity-100')} autoPlay muted playsInline />
                    {(interviewState === 'reviewing' && lastAnswerUrl) && (
                        <video key={lastAnswerUrl} src={lastAnswerUrl} className="absolute inset-0 w-full h-full object-cover z-10" controls autoPlay loop />
                    )}
                     <div className="absolute top-1 left-1 flex items-center gap-1 bg-black/50 text-white text-xs p-1 rounded-md">
                      {isCameraReady ? <><Video className="h-3 w-3 text-green-500"/> ON</> : <><VideoOff className="h-3 w-3 text-red-500"/> OFF</> }
                    </div>
               </div>
           </div>

            {currentQuestion && (
              <Card><CardContent className="p-4 text-center"><p className="font-semibold">{currentQuestion}</p></CardContent></Card>
            )}

             {interviewState === 'recording' && <Button onClick={handleStopClick} variant="destructive" className="w-full">Stop Recording</Button>}

             {interviewState === 'reviewing' && (
                 <div className="flex gap-4 justify-center mt-4">
                    <Button onClick={handleRetake} disabled={retakesLeft === 0}><RefreshCw className="mr-2 h-4 w-4" />Retake ({retakesLeft} left)</Button>
                    <Button onClick={handleNextQuestion} variant="default"><Check className="mr-2 h-4 w-4" />{currentQuestionIndex === questions.length - 1 ? 'Finish & Get Feedback' : 'Submit & Next'}</Button>
                </div>
             )}
             
             {interviewState === 'finished' && (
                <div className="text-center">
                    <Button onClick={restartInterview}><RefreshCw className="mr-2 h-4 w-4" />Start New Interview</Button>
                </div>
             )}
        </div>
    )
  };
  
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      {currentAudio && <audio ref={audioRef} src={currentAudio} onEnded={handleAudioEnded} hidden />}
      <div className="w-full max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-headline">AI Interview Coach</CardTitle>
            <CardDescription>
              This is a mock interview to help you train and improve your skills for the real thing.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[60vh]">
            {renderContent()}
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
