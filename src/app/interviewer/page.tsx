
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useTimer } from 'use-timer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Video, VideoOff, RefreshCw, Check, Loader2, Play, Bot, Star, ChevronDown, UserSquare, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const RESPONSE_TIME = 90; // seconds
const PREPARATION_TIME = 3; // seconds
const MAX_RETAKES = 2;

type InterviewState = 'idle' | 'generating' | 'preparing' | 'recording' | 'reviewing' | 'finished' | 'error';

// Add types for SpeechRecognition API
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    [index: number]: SpeechRecognitionResult;
    length: number;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    [index: number]: SpeechRecognitionAlternative;
    length: number;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    onresult: (event: SpeechRecognitionEvent) => void;
    onend: () => void;
    start: () => void;
    stop: () => void;
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}


const generalQuestions = [
    "Tell me about yourself.",
    "Why are you interested in this position?",
    "What are your greatest strengths?",
    "What are your greatest weaknesses?",
    "Where do you see yourself in five years?",
];

const professionQuestions: Record<string, string[]> = {
    "Software Engineer": [
        "Describe a complex project you've worked on and your role in it.",
        "How do you stay updated with new technologies?",
        "Explain the difference between a process and a thread.",
        "What's your experience with Agile methodologies?",
        "How do you handle a bug in production?"
    ],
    "Product Manager": [
        "How do you prioritize a product roadmap?",
        "Describe a time you had to say no to a feature request from a stakeholder.",
        "What is your favorite product and why?",
        "How do you measure the success of a new feature?",
        "Walk me through a product launch you managed."
    ],
    "UX/UI Designer": [
        "Describe your design process from start to finish.",
        "How do you incorporate user feedback into your designs?",
        "Tell me about a time you had to defend your design choices.",
        "What tools do you use for prototyping and collaboration?",
        "How do you stay on top of design trends?"
    ],
    "Data Scientist": [
        "Explain a machine learning model you've built to a non-technical audience.",
        "How do you handle missing or incomplete data?",
        "Describe a time you used data to influence a business decision.",
        "What is the difference between supervised and unsupervised learning?",
        "How do you validate the performance of your models?"
    ],
    "Marketing Manager": [
        "What's your experience with content marketing strategies?",
        "Describe a successful marketing campaign you led.",
        "How do you measure ROI on a marketing budget?",
        "Tell me about a time you failed in a marketing effort.",
        "What digital marketing channels are you most familiar with?"
    ],
};

const professions = Object.keys(professionQuestions);

interface Answer {
    question: string;
    videoUrl: string | null;
    transcript: string;
}

const shuffleArray = (array: string[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

export default function InterviewerPage() {
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [interviewState, setInterviewState] = useState<InterviewState>('idle');
    const [questions, setQuestions] = useState<string[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [retakesLeft, setRetakesLeft] = useState(MAX_RETAKES);
    
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [selectedProfession, setSelectedProfession] = useState<string>(professions[0]);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const stopRecognitionOnPurpose = useRef(false);
    const streamRef = useRef<MediaStream | null>(null);
    const { toast } = useToast();

    const { time: prepTime, start: startPrepTimer, reset: resetPrepTimer, status: prepTimerStatus } = useTimer({
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

    const getCameraPermission = useCallback(async () => {
        console.log('Attempting to get camera permissions...');
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: { ideal: 640 }, height: { ideal: 480 } }, 
                audio: true 
            });
            streamRef.current = stream;
            console.log('Camera permission granted.');
            setHasCameraPermission(true);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            // Quick fallback to ensure camera ready state
            setTimeout(() => {
                console.log('1-second timeout: Forcing camera ready state.');
                setIsCameraReady(true);
            }, 1000);
        } catch (error: any) {
            console.error('Error accessing camera:', error);
            setHasCameraPermission(false);
            if (error.name === 'NotAllowedError') {
                toast({
                    variant: 'destructive',
                    title: 'Camera Access Denied',
                    description: 'Please allow camera and microphone access in your browser settings.'
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Camera Error',
                    description: `Could not access camera. Please ensure it's not in use by another application. Error: ${error.message}`
                });
            }
        }
    }, [toast]);

    // Effect for initializing camera
    useEffect(() => {
        if (hasCameraPermission === null) {
            getCameraPermission();
        }

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [hasCameraPermission, getCameraPermission]);

    // Effect for initializing speech recognition
    useEffect(() => {
        if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
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
            
            recognitionRef.current.onend = () => {
                if (!stopRecognitionOnPurpose.current && interviewState === 'recording') {
                    recognitionRef.current?.start();
                }
            };
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [interviewState]);

    // Fallback timer to ensure camera becomes ready
    useEffect(() => {
        if (hasCameraPermission && !isCameraReady) {
            const timer = setTimeout(() => {
                console.log('5-second fallback: Setting camera to ready.');
                setIsCameraReady(true);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [hasCameraPermission, isCameraReady]);

    const handleStartInterview = async () => {
        console.log('Starting interview. Camera ready:', isCameraReady);
        if (!isCameraReady) {
            toast({ variant: 'destructive', title: 'Camera Not Ready', description: 'Please wait for camera to initialize.' });
            return;
        }
        setInterviewState('preparing');
        
        // Generate questions
        const professionRelated = professionQuestions[selectedProfession] || [];
        const combinedQuestions = [
            ...shuffleArray(generalQuestions).slice(0, 2),
            ...shuffleArray(professionRelated).slice(0, 3)
        ];
        setQuestions(combinedQuestions);
        setAnswers([]);
        setCurrentQuestionIndex(0);
        setRetakesLeft(MAX_RETAKES);
        
        resetPrepTimer();
        startPrepTimer();
    };
    
    const startRecording = () => {
        if (!streamRef.current) {
            console.error('No stream available for recording');
            setInterviewState('error');
            return;
        }
        console.log('Starting recording...');
        setInterviewState('recording');
        setCurrentTranscript('');
        resetResponseTimer();
        startResponseTimer();
        
        try {
            const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
            mediaRecorderRef.current = recorder;
            const chunks: Blob[] = [];

            recorder.ondataavailable = (event) => { 
                if(event.data.size > 0) chunks.push(event.data);
            };
            
            recorder.onstop = () => {
                console.log('Recording stopped.');
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                setAnswers(prev => [...prev, { 
                    question: questions[currentQuestionIndex], 
                    videoUrl: url, 
                    transcript: currentTranscript.trim() 
                }]);
                setInterviewState('reviewing');
                pauseResponseTimer();
            };
            
            recorder.start();
            if (recognitionRef.current) {
                stopRecognitionOnPurpose.current = false;
                recognitionRef.current.start();
            }
        } catch (error) {
            console.error('Error starting recording:', error);
            setInterviewState('error');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (recognitionRef.current) {
            stopRecognitionOnPurpose.current = true;
            recognitionRef.current.stop();
        }
    };

    const handleRetake = () => {
        if (retakesLeft > 0) {
            setRetakesLeft(prev => prev - 1);
            setAnswers(prev => prev.slice(0, -1));
            setInterviewState('preparing');
            resetPrepTimer();
            startPrepTimer();
        }
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setRetakesLeft(MAX_RETAKES);
            setInterviewState('preparing');
            resetPrepTimer();
            startPrepTimer();
        } else {
            finishInterview();
        }
    };

    const finishInterview = () => {
        setInterviewState('finished');
    };

    const restartInterview = () => {
        setInterviewState('idle');
        setHasCameraPermission(null);
        setIsCameraReady(false);
    };
    
    const handleCameraReady = () => {
        console.log('Camera is ready (onCanPlay/onLoadedMetadata)');
        setIsCameraReady(true);
    };

    const renderInterviewerOverlay = () => {
        switch(interviewState) {
            case 'preparing':
                return <div className="text-center"><h2 className="text-xl font-semibold mb-4">Get Ready!</h2><p className="text-4xl font-bold">{prepTime}</p></div>;
            case 'recording':
                return <div className="text-center"><div className="text-2xl font-bold text-red-500 mb-2">Recording... {responseTime}s</div></div>;
            case 'reviewing':
                return <div className="text-center"><h2 className="text-xl font-semibold">Answer Submitted!</h2><Check className="h-12 w-12 text-green-500 mx-auto mt-2" /></div>;
            case 'generating':
                return <div className="text-center"><Loader2 className="h-12 w-12 text-white animate-spin mr-2" /> <p>Generating Questions...</p></div>;
            case 'finished':
                return <div className="text-center"><h2 className="text-xl font-semibold">Interview Complete!</h2><Check className="h-12 w-12 text-green-500 mx-auto mt-2" /><p>Well done! Review your results below.</p></div>;
            case 'error':
                 return <div className="text-center text-red-400"><h2 className="text-xl font-semibold">An Error Occurred</h2><p>Please refresh the page and try again.</p></div>;
            default:
                return <div className="flex flex-col items-center justify-center text-center h-full"><UserSquare className="h-24 w-24 text-white/50 mb-4" /><p className="text-white/80">The interviewer will appear here.</p></div>
        }
    };

    const renderContent = () => {
        if (hasCameraPermission === false) return (
            <Alert variant="destructive">
                <VideoOff className="h-4 w-4" />
                <AlertTitle>Camera Access Required</AlertTitle>
                <AlertDescription>
                    Please allow camera and microphone access. You may need to reload the page after granting permissions.
                </AlertDescription>
                <Button variant="secondary" size="sm" className="mt-4" onClick={() => getCameraPermission()}>Try Again</Button>
            </Alert>
        );
        
        if (hasCameraPermission === null) return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Initializing Camera...</span>
            </div>
        );

        if (interviewState === 'idle') return (
            <div className="text-center">
                <h2 className="text-xl font-semibold mb-4">Practice your interview skills</h2>
                <p className="text-muted-foreground mb-6">Select a profession and answer AI-generated questions.</p>
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">{selectedProfession} <ChevronDown className="ml-2 h-4 w-4" /></Button>
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
        const showPlayer = (interviewState === 'reviewing' && lastAnswerUrl);

        return (
            <div className="w-full space-y-4">
                <div className="aspect-video w-full bg-black rounded-lg overflow-hidden relative flex items-center justify-center">
                    <motion.div
                        animate={{ scale: [1, 1.02, 1], transition: { duration: 5, repeat: Infinity, ease: "easeInOut" } }}
                        className="w-full h-full"
                    >
                         <Image
                            src="/interviewer.png"
                            data-ai-hint="professional person"
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover"
                            alt="Interviewer"
                            priority
                        />
                    </motion.div>
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 text-white">
                        {renderInterviewerOverlay()}
                    </div>
                    <div className="absolute bottom-4 right-4 h-1/4 aspect-video bg-black rounded-md overflow-hidden border-2 border-white/50">
                        <video
                            ref={videoRef}
                            onLoadedMetadata={handleCameraReady}
                            onCanPlay={handleCameraReady}
                            className={cn("w-full h-full object-cover transition-opacity", showPlayer ? 'opacity-0' : 'opacity-100')}
                            autoPlay
                            muted
                            playsInline
                        />
                        {showPlayer && lastAnswerUrl && (
                            <video key={lastAnswerUrl} src={lastAnswerUrl} className="absolute inset-0 w-full h-full object-cover z-10" controls autoPlay loop />
                        )}
                        <div className="absolute top-1 left-1 flex items-center gap-1 bg-black/50 text-white text-xs p-1 rounded-md">
                            {isCameraReady ? <><Video className="h-3 w-3 text-green-500" /> ON</> : <><VideoOff className="h-3 w-3 text-red-500" /> OFF</>}
                        </div>
                    </div>
                </div>

                {currentQuestion && (
                    <Card><CardContent className="p-4 text-center"><p className="font-semibold">{currentQuestion}</p></CardContent></Card>
                )}

                {interviewState === 'recording' && <Button onClick={stopRecording} variant="destructive" className="w-full">Stop Recording</Button>}

                {interviewState === 'reviewing' && (
                    <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
                        <Button onClick={handleRetake} disabled={retakesLeft <= 0}><RefreshCw className="mr-2 h-4 w-4" />Retake ({retakesLeft} left)</Button>
                        <Button onClick={handleNextQuestion} variant="default"><Check className="mr-2 h-4 w-4" />{currentQuestionIndex === questions.length - 1 ? 'Finish & Get Feedback' : 'Submit & Next'}</Button>
                    </div>
                )}
                
                {interviewState === 'finished' && (
                    <div className="text-center">
                        <Button onClick={restartInterview}><RefreshCw className="mr-2 h-4 w-4" />Start New Interview</Button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
            <div className="w-full max-w-4xl space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-headline">AI Interview Coach</CardTitle>
                        <CardDescription>
                            Practice your interview skills by answering AI-generated questions for your chosen profession.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center min-h-[60vh]">
                        {renderContent()}
                    </CardContent>
                </Card>

                {interviewState === 'finished' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Star className="text-primary h-6 w-6" /> Your Results</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                                <AccordionItem value="item-1">
                                    <AccordionTrigger>
                                        <div className="flex items-center gap-2"><Play className="h-5 w-5" /> Review Your Answers</div>
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

    