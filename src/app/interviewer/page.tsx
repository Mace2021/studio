
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useTimer } from 'use-timer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Video, VideoOff, RefreshCw, Check, Loader2, Play, Bot, Star, ChevronDown, UserSquare, Camera, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { generateQuestions } from '@/ai/flows/generate-questions-flow';
import { getInterviewFeedback } from '@/ai/flows/interview-feedback-flow';
import { textToSpeech } from '@/ai/flows/text-to-speech-flow';


const RESPONSE_TIME = 90; // seconds
const PREPARATION_TIME = 3; // seconds
const MAX_RETAKES = 2;

type InterviewState = 'idle' | 'generating' | 'generating-audio' | 'playing-audio' | 'preparing' | 'recording' | 'reviewing' | 'analyzing' | 'finished' | 'error';

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

const professions = [
    "Software Engineer",
    "Product Manager",
    "UX/UI Designer",
    "Data Scientist",
    "Marketing Manager",
    "Registered Nurse",
    "Accountant",
    "Teacher",
];

interface Answer {
    question: string;
    videoUrl: string | null;
    transcript: string;
}

export default function InterviewerPage() {
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [interviewState, setInterviewState] = useState<InterviewState>('idle');
    const [questions, setQuestions] = useState<string[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [retakesLeft, setRetakesLeft] = useState(MAX_RETAKES);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [selectedProfession, setSelectedProfession] = useState<string>(professions[0]);
    
    const [currentAudio, setCurrentAudio] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const stopRecognitionOnPurpose = useRef(false);
    const streamRef = useRef<MediaStream | null>(null);
    const { toast } = useToast();

    const { time: prepTime, start: startPrepTimer, reset: resetPrepTimer } = useTimer({
        initialTime: PREPARATION_TIME,
        timerType: 'DECREMENTAL',
        endTime: 0,
        onTimeOver: () => startRecording(),
    });

    const { time: responseTime, start: startResponseTimer, pause: pauseResponseTimer, reset: resetResponseTimer } = useTimer({
        initialTime: RESPONSE_TIME,
        timerType: 'DECREMENTAL',
        endTime: 0,
        onTimeOver: () => {
            if (interviewState === 'recording') {
                stopRecording();
            }
        },
    });

    const cleanupStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            console.log('Camera stream cleaned up.');
        }
    }, []);

    // Effect for camera and speech recognition initialization
    useEffect(() => {
        const initialize = async () => {
            console.log('Initializing camera and speech recognition...');
            cleanupStream();
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 640 }, height: { ideal: 480 } },
                    audio: true,
                });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setHasCameraPermission(true);
                console.log('Camera permission granted and stream attached.');
            } catch (error: any) {
                console.error('Camera permission error:', error);
                setHasCameraPermission(false);
                toast({
                    variant: 'destructive',
                    title: 'Camera Access Denied',
                    description: `Please allow camera and microphone access. Error: ${error.message}`,
                });
            }
        };

        initialize();

        if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            const recognition = recognitionRef.current;
            recognition.continuous = true;
            recognition.interimResults = true;

            recognition.onresult = (event: SpeechRecognitionEvent) => {
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
                if (!stopRecognitionOnPurpose.current && interviewState === 'recording') {
                    console.log('Speech recognition ended unexpectedly, restarting...');
                    recognitionRef.current?.start();
                }
            };
        }

        return () => {
            cleanupStream();
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    const generateAndPlayQuestion = async (questionText: string) => {
        setInterviewState('generating-audio');
        try {
            const { audio, error } = await textToSpeech(questionText);
            if (error || !audio) {
                throw new Error(error || "Failed to generate audio.");
            }
            setCurrentAudio(audio);
            setInterviewState('playing-audio');
        } catch (e) {
            toast({ variant: 'destructive', title: 'Audio Error', description: "Couldn't generate question audio. Starting without it." });
            setInterviewState('preparing');
            startPrepTimer();
        }
    };
    
    const handleStartInterview = async () => {
        if (!hasCameraPermission) {
            toast({ variant: 'destructive', title: 'Camera Not Ready', description: 'Please grant camera permission to start.' });
            return;
        }
        setInterviewState('generating');
        setFeedback(null);
        try {
            const result = await generateQuestions({ profession: selectedProfession });
            setQuestions(result.questions);
            setAnswers([]);
            setCurrentQuestionIndex(0);
            setRetakesLeft(MAX_RETAKES);
            await generateAndPlayQuestion(result.questions[0]);
        } catch (error) {
            console.error("Error starting interview:", error);
            setInterviewState('error');
        }
    };
    
    const startRecording = () => {
        if (!streamRef.current) {
            setInterviewState('error');
            toast({ variant: 'destructive', title: 'Camera Error', description: 'Camera is not available to start recording.' });
            return;
        }
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
                console.log("Speech recognition started.");
            }
        } catch (error) {
            console.error("Error starting recording:", error);
            setInterviewState('error');
        }
    };

    const stopRecording = () => {
        console.log("Stopping recording...");
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (recognitionRef.current) {
            stopRecognitionOnPurpose.current = true;
            recognitionRef.current.stop();
            console.log("Speech recognition stopped purposefully.");
        }
    };

    const handleRetake = () => {
        if (retakesLeft > 0) {
            setRetakesLeft(prev => prev - 1);
            setAnswers(prev => prev.slice(0, -1)); // Remove last answer
            generateAndPlayQuestion(questions[currentQuestionIndex]);
        }
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            const nextIdx = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextIdx);
            setRetakesLeft(MAX_RETAKES);
            generateAndPlayQuestion(questions[nextIdx]);
        } else {
            finishInterview();
        }
    };
    
    const finishInterview = async () => {
        setInterviewState('analyzing');
        try {
            const questionsAndAnswers = answers.map(a => ({ question: a.question, answer: a.transcript }));
            const result = await getInterviewFeedback({ profession: selectedProfession, questionsAndAnswers });
            setFeedback(result.feedback);
        } catch (error) {
            setFeedback("<p>Sorry, we couldn't generate feedback for this interview. Please try again later.</p>");
        }
        setInterviewState('finished');
    };

    const restartInterview = () => {
        window.location.reload();
    };

    const handleAudioEnded = () => {
        setInterviewState('preparing');
        resetPrepTimer();
        startPrepTimer();
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
            case 'generating-audio':
                return <div className="text-center"><Loader2 className="h-12 w-12 text-white animate-spin mr-2" /> <p>Preparing Question Audio...</p></div>;
            case 'playing-audio':
                return <div className="text-center flex items-center gap-4"><Volume2 className="h-12 w-12 text-white" /> <p>Listen to the question...</p></div>;
            case 'analyzing':
                return <div className="text-center"><Loader2 className="h-12 w-12 text-white animate-spin mr-2" /> <p>Analyzing your answers...</p></div>;
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
                <Button variant="secondary" size="sm" className="mt-4" onClick={() => window.location.reload()}>Reload Page</Button>
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
                    <Button onClick={handleStartInterview} disabled={!hasCameraPermission}>
                        {!hasCameraPermission ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                        {hasCameraPermission ? 'Start Interview' : 'Camera Loading...'}
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
                        animate={{ scale: interviewState === 'playing-audio' ? [1, 1.02, 1] : 1 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="w-full h-full relative"
                    >
                         <Image
                            src="https://picsum.photos/1280/720"
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
                            className={cn("w-full h-full object-cover transition-opacity", showPlayer ? 'opacity-0' : 'opacity-100')}
                            autoPlay
                            muted
                            playsInline
                        />
                        {showPlayer && lastAnswerUrl && (
                            <video key={lastAnswerUrl} src={lastAnswerUrl} className="absolute inset-0 w-full h-full object-cover z-10" controls autoPlay loop />
                        )}
                        <div className="absolute top-1 left-1 flex items-center gap-1 bg-black/50 text-white text-xs p-1 rounded-md">
                            {hasCameraPermission ? <><Video className="h-3 w-3 text-green-500" /> ON</> : <><VideoOff className="h-3 w-3 text-red-500" /> OFF</>}
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
            {currentAudio && <audio ref={audioRef} src={currentAudio} onEnded={handleAudioEnded} autoPlay hidden />}
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

                {interviewState === 'finished' && feedback && (
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
                                 <AccordionItem value="item-2">
                                    <AccordionTrigger>
                                        <div className="flex items-center gap-2"><Bot className="h-5 w-5" /> AI Feedback</div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: feedback }}/>
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
