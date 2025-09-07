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
import { ScrollArea } from '@/components/ui/scroll-area';


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
    "Data Analyst",
    "DevOps Engineer",
    "Cybersecurity Analyst",
    "Marketing Manager",
    "Sales Representative",
    "Registered Nurse",
    "Doctor",
    "Pharmacist",
    "Physical Therapist",
    "Medical Assistant",
    "Environmental Health",
    "Accountant",
    "Financial Analyst",
    "Investment Banker",
    "Management Consultant",
    "Teacher",
    "School Principal",
    "Librarian",
    "Lawyer",
    "Paralegal",
    "Graphic Designer",
    "Architect",
    "Chef",
    "Electrician",
    "Plumber",
    "Civil Engineer",
    "Mechanical Engineer",
    "Customer Service Representative",
    "Human Resources Manager",
    "Project Manager"
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
    const [isUsingSpeechSynthesis, setIsUsingSpeechSynthesis] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const stopRecognitionOnPurpose = useRef(false);
    const streamRef = useRef<MediaStream | null>(null);
    const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
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
        }
    }, []);

    const handleAudioEnded = useCallback(() => {
        if (isUsingSpeechSynthesis && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        setInterviewState('preparing');
        resetPrepTimer();
        startPrepTimer();
    }, [isUsingSpeechSynthesis, resetPrepTimer, startPrepTimer]);

    // Enhanced text-to-speech function with fallback
    const enhancedTextToSpeech = useCallback(async (text: string): Promise<{ audio?: string; success: boolean }> => {
        try {
            const result = await textToSpeech(text);
            if (result && !result.error && result.audio) {
                return { audio: result.audio, success: true };
            }
            console.warn('Custom TTS failed, falling back to Speech Synthesis API. Reason:', result.error);
        } catch (error) {
            console.error('Error calling custom TTS flow:', error);
        }

        // Fallback to browser's Speech Synthesis API
        try {
            if ('speechSynthesis' in window) {
                return new Promise((resolve) => {
                    const utterance = new SpeechSynthesisUtterance(text);
                    speechSynthesisRef.current = utterance;
                    
                    utterance.rate = 0.9;
                    utterance.pitch = 1;
                    utterance.volume = 0.8;
                    
                    const voices = window.speechSynthesis.getVoices();
                    const preferredVoice = voices.find(voice => 
                        voice.name.includes('Google') || 
                        voice.name.includes('Microsoft') || 
                        voice.lang.includes('en-US')
                    );
                    if (preferredVoice) {
                        utterance.voice = preferredVoice;
                    }
                    
                    utterance.onend = () => {
                       handleAudioEnded(); // Use the central handler
                       resolve({ success: true });
                    };
                    
                    utterance.onerror = (event) => {
                        console.error('Speech synthesis error:', event);
                        handleAudioEnded();
                        resolve({ success: false });
                    };
                    
                    window.speechSynthesis.speak(utterance);
                    setIsUsingSpeechSynthesis(true);
                });
            } else {
                return { success: false };
            }
        } catch (synthError) {
            console.error('Speech Synthesis fallback failed:', synthError);
            return { success: false };
        }
    }, [handleAudioEnded]);

    // Effect for camera and speech recognition initialization
    useEffect(() => {
        const initialize = async () => {
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
            } catch (error: any) {
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
                   try {
                     if (recognitionRef.current) {
                        recognitionRef.current.start();
                     }
                   } catch (e) {
                    console.error("Error restarting recognition onend:", e);
                   }
                }
            };
        }

        // Load voices for speech synthesis
        if ('speechSynthesis' in window) {
            const loadVoices = () => {
                window.speechSynthesis.getVoices();
            };
            loadVoices();
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        return () => {
            cleanupStream();
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    // Effect to generate and play question when index changes
    useEffect(() => {
        const generateAndPlayQuestion = async () => {
            setInterviewState('generating-audio');
            setIsUsingSpeechSynthesis(false);
            setCurrentAudio(null);
            
            try {
                const questionText = questions[currentQuestionIndex];
                const result = await enhancedTextToSpeech(questionText);
                
                if (result.success) {
                    if (result.audio) {
                        // Audio URL was generated successfully
                        setCurrentAudio(result.audio);
                        setInterviewState('playing-audio');
                    } else {
                        // Using speech synthesis, which plays automatically.
                        // The onend event of the utterance will trigger the next step.
                        setInterviewState('playing-audio');
                    }
                } else {
                    throw new Error("All TTS methods failed");
                }
            } catch (error) {
                console.error("TTS Error:", error);
                toast({ 
                    variant: 'default', 
                    title: 'Audio Unavailable', 
                    description: "Continuing without question audio. You can read the question below." 
                });
                // Directly move to preparing state
                handleAudioEnded();
            }
        };

        if (interviewState === 'generating' && questions.length > 0) {
            generateAndPlayQuestion();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [interviewState, questions, currentQuestionIndex, enhancedTextToSpeech, toast, handleAudioEnded]);

    useEffect(() => {
        if (interviewState === 'playing-audio' && currentAudio && audioRef.current && !isUsingSpeechSynthesis) {
            audioRef.current.play().catch(error => {
                console.error("Audio play failed:", error);
                toast({ 
                    variant: 'default', 
                    title: 'Audio Playback Issue', 
                    description: "Continuing without audio. Please read the question below." 
                });
                handleAudioEnded();
            });
        }
    }, [interviewState, currentAudio, isUsingSpeechSynthesis, toast, handleAudioEnded]);
    
    const handleStartInterview = async () => {
        if (hasCameraPermission !== true) {
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
        } catch (error) {
            console.error("Error starting interview:", error);
            setInterviewState('error');
            toast({
                variant: 'destructive',
                title: 'Interview Start Error',
                description: 'Failed to generate questions. Please try again.'
            });
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
                try {
                   if (recognitionRef.current) {
                     recognitionRef.current.start();
                   }
                } catch (e) {
                    // This can happen if recognition is already started, which is fine.
                    console.warn("Could not start speech recognition:", e);
                }
            }
        } catch (error) {
            console.error("Error starting recording:", error);
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
            setAnswers(prev => prev.slice(0, -1)); // Remove last answer
            setInterviewState('generating'); // This will trigger the audio generation again
        }
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            const nextIdx = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextIdx);
            setRetakesLeft(MAX_RETAKES);
            setInterviewState('generating'); // This will trigger the next question
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
            console.error("Feedback generation error:", error);
            setFeedback("<p>Sorry, we couldn't generate feedback for this interview. Please try again later.</p>");
        }
        setInterviewState('finished');
    };

    const restartInterview = () => {
        // Clean up any ongoing speech synthesis
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        window.location.reload();
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
            case 'generating-audio':
                return <div className="text-center"><Loader2 className="h-12 w-12 text-white animate-spin mr-2" /> <p>Preparing Question...</p></div>;
            case 'playing-audio':
                return <div className="text-center flex items-center gap-4"><Volume2 className="h-12 w-12 text-white" /> <p>{isUsingSpeechSynthesis ? 'AI is speaking...' : 'Listen to the question...'}</p></div>;
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
                            <ScrollArea className="h-72 w-48 rounded-md border">
                                {professions.map(p => <DropdownMenuItem key={p} onSelect={() => setSelectedProfession(p)}>{p}</DropdownMenuItem>)}
                            </ScrollArea>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button onClick={handleStartInterview} disabled={hasCameraPermission !== true}>
                        {hasCameraPermission !== true ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                        {hasCameraPermission === true ? 'Start Interview' : 'Camera Loading...'}
                    </Button>
                </div>
            </div>
        );

        const lastAnswerUrl = answers.length > 0 ? answers[answers.length - 1].videoUrl : null;
        const currentQuestion = questions[currentQuestionIndex];
        const showPlayer = (interviewState === 'reviewing' && lastAnswerUrl);

        return (
            <div className="w-full space-y-4">
                <div className="h-[40vh] md:h-[50vh] w-full bg-black rounded-lg overflow-hidden relative flex items-center justify-center">
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
                        />
                    </motion.div>
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 text-white">
                        {renderInterviewerOverlay()}
                    </div>
                    <div className="absolute bottom-4 right-4 h-1/3 sm:h-1/4 aspect-video bg-black rounded-md overflow-hidden border-2 border-white/50">
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
                    <Card>
                        <CardContent className="p-4 text-center">
                            <p className="font-semibold text-lg">{currentQuestion}</p>
                        </CardContent>
                    </Card>
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
        <div className="flex flex-col items-center justify-center p-4">
            <audio ref={audioRef} onEnded={handleAudioEnded} hidden />
            <div className="w-full max-w-4xl space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-headline">AI Interview Coach</CardTitle>
                        <CardDescription>
                            Practice your interview skills by answering AI-generated questions for your chosen profession.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center min-h-[50vh]">
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
