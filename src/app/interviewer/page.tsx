
'use client';

import { useState, useEffect, useRef } from 'react';
import { useTimer } from 'use-timer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Video, VideoOff, Mic, MicOff, RefreshCw, Check, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const INTERVIEW_QUESTIONS = [
  "Tell me about yourself.",
  "What are your biggest strengths?",
  "What is your greatest weakness?",
  "Where do you see yourself in five years?",
  "Why should we hire you for this position?",
];

const PREPARATION_TIME = 3; // seconds
const RESPONSE_TIME = 90; // seconds
const MAX_RETAKES = 2; // 3 total attempts (1 initial + 2 retakes)

type InterviewState = 'idle' | 'preparing' | 'recording' | 'reviewing' | 'finished' | 'error';

export default function InterviewerPage() {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [interviewState, setInterviewState] = useState<InterviewState>('idle');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [retakesLeft, setRetakesLeft] = useState(MAX_RETAKES);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const { toast } = useToast();

  const { time: prepTime, start: startPrepTimer, reset: resetPrepTimer, status: prepStatus } = useTimer({
    initialTime: PREPARATION_TIME,
    timerType: 'DECREMENTAL',
    endTime: 0,
    onTimeOver: () => {
        startRecording();
    },
  });

  const { time: responseTime, start: startResponseTimer, pause: pauseResponseTimer, reset: resetResponseTimer, status: responseStatus } = useTimer({
    initialTime: RESPONSE_TIME,
    timerType: 'DECREMENTAL',
    endTime: 0,
    onTimeOver: () => {
        if (interviewState === 'recording') {
            stopRecording();
        }
    },
  });

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera and microphone permissions in your browser settings to use this feature.',
        });
      }
    };

    getCameraPermission();

    return () => {
      // Clean up media stream
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [toast]);
  
  const startInterview = () => {
    setInterviewState('preparing');
    startPrepTimer();
  }

  const startRecording = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      setInterviewState('recording');
      setRecordedChunks([]);
      setVideoUrl(null);
      resetResponseTimer();
      startResponseTimer();
      
      const stream = videoRef.current.srcObject as MediaStream;
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks((prev) => [...prev, event.data]);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setInterviewState('reviewing');
        pauseResponseTimer();
      };
      
      mediaRecorderRef.current.start();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'No camera stream available.' });
      setInterviewState('error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
    }
  }

  const handleRetake = () => {
    if (retakesLeft > 0) {
        setRetakesLeft(prev => prev - 1);
        setInterviewState('preparing');
        startPrepTimer();
    } else {
        toast({ title: 'No retakes left', description: 'You must submit your current answer.' });
    }
  };

  const handleSubmit = () => {
    // In a real app, you would upload the video blob here.
    toast({ title: 'Answer Submitted!', description: `Your answer for question ${currentQuestionIndex + 1} has been saved.`});
    
    if (currentQuestionIndex < INTERVIEW_QUESTIONS.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setRetakesLeft(MAX_RETAKES);
        setInterviewState('preparing');
        resetResponseTimer();
        startPrepTimer();
    } else {
        setInterviewState('finished');
    }
  };
  
  const renderContent = () => {
      if (hasCameraPermission === false) {
           return (
            <Alert variant="destructive">
                <VideoOff className="h-4 w-4" />
                <AlertTitle>Camera Access Required</AlertTitle>
                <AlertDescription>
                    Please allow camera and microphone access in your browser settings to start the interview.
                </AlertDescription>
            </Alert>
           );
      }
      
      if (hasCameraPermission === null) {
          return (
            <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Waiting for camera permission...</span>
            </div>
          )
      }
      
      switch (interviewState) {
          case 'idle':
            return (
                <div className="text-center">
                    <h2 className="text-xl font-semibold mb-4">Ready for your interview?</h2>
                    <p className="text-muted-foreground mb-6">You will be asked {INTERVIEW_QUESTIONS.length} questions. You will have {PREPARATION_TIME} seconds to prepare and {RESPONSE_TIME} seconds to answer each question.</p>
                    <Button onClick={startInterview}>Start Interview</Button>
                </div>
            );
          case 'preparing':
            return (
                <div className="text-center">
                    <h2 className="text-xl font-semibold mb-4">Get Ready!</h2>
                    <p className="text-4xl font-bold">{prepTime}</p>
                </div>
            );
          case 'recording':
            return (
                <div className="text-center">
                    <div className="text-2xl font-bold text-red-500 mb-2">Recording... {responseTime}s</div>
                    <Button onClick={stopRecording} variant="destructive">Stop Recording</Button>
                </div>
            );
          case 'reviewing':
            return (
                <div className="text-center space-y-4">
                     <h2 className="text-xl font-semibold">Review Your Answer</h2>
                     <div className="flex gap-4 justify-center">
                        <Button onClick={handleRetake} disabled={retakesLeft === 0}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retake ({retakesLeft} left)
                        </Button>
                        <Button onClick={handleSubmit} variant="default">
                            <Check className="mr-2 h-4 w-4" />
                            Submit Answer
                        </Button>
                     </div>
                </div>
            );
          case 'finished':
            return (
                <div className="text-center">
                    <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold">Interview Complete!</h2>
                    <p className="text-muted-foreground">Thank you. Your interview has been submitted successfully.</p>
                </div>
            );
          default:
            return <p>An unexpected error occurred.</p>;
      }
  }
  
  const currentQuestion = INTERVIEW_QUESTIONS[currentQuestionIndex];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <Card className="w-full max-w-3xl">
            <CardHeader>
                <CardTitle className="text-2xl font-headline">Video Interview</CardTitle>
                <CardDescription>
                    {interviewState !== 'idle' && interviewState !== 'finished' ? `Question ${currentQuestionIndex + 1} of ${INTERVIEW_QUESTIONS.length}` : 'Follow the instructions to complete your interview.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="aspect-video w-full bg-muted rounded-md overflow-hidden relative">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                    
                    {interviewState === 'reviewing' && videoUrl && (
                        <video src={videoUrl} className="absolute inset-0 w-full h-full object-cover z-10" controls autoPlay loop />
                    )}

                    <div className="absolute top-2 left-2 flex items-center gap-2 bg-black/50 text-white text-xs p-1 rounded-md">
                        {hasCameraPermission ? <><Video className="h-4 w-4 text-green-500"/> ON</> : <><VideoOff className="h-4 w-4 text-red-500"/> OFF</> }
                    </div>
                </div>
                
                {interviewState !== 'idle' && interviewState !== 'finished' && (
                  <Card>
                    <CardContent className="p-4 text-center">
                        <p className="font-semibold">{currentQuestion}</p>
                    </CardContent>
                  </Card>
                )}

                <div className="h-24 flex items-center justify-center">
                    {renderContent()}
                </div>

            </CardContent>
        </Card>
    </div>
  );
}
