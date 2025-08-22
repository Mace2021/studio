
'use client';

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MapPin, Phone, Bot, Send, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { contactChat } from "@/ai/flows/contact-chat-flow";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Message {
    sender: 'user' | 'bot';
    text: string;
}

export default function ContactPage() {
    const [messages, setMessages] = useState<Message[]>([
        { sender: 'bot', text: "Hello! I'm the Visual Dashboard support bot. How can I help you today?" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage: Message = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await contactChat({ message: input, history: messages });
            const botMessage: Message = { sender: 'bot', text: response.reply };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            const errorMessage: Message = { sender: 'bot', text: "Sorry, I'm having trouble connecting. Please try again later." };
            setMessages(prev => [...prev, errorMessage]);
            console.error("Chatbot error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-start justify-center p-4">
            <div className="grid w-full max-w-6xl grid-cols-1 gap-8 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-headline">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">
                            Have questions or want to learn more? Reach out to us.
                        </p>
                        <div className="flex items-center gap-4 pt-2">
                            <Mail className="h-5 w-5 text-primary" />
                            <a href="mailto:elvizbiz@gmail.com" className="hover:underline">elvizbiz@gmail.com</a>
                        </div>
                        <div className="flex items-center gap-4">
                            <Phone className="h-5 w-5 text-primary" />
                            <span>+1 (520) 314-7933</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <MapPin className="h-5 w-5 text-primary" />
                            <span>Tucson, Arizona 85746</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-2xl font-headline">
                            <Bot />
                            <span>Chat with our AI Assistant</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col justify-between gap-4">
                        <div className="space-y-4 h-80 overflow-y-auto rounded-md border p-4">
                            {messages.map((message, index) => (
                                <div key={index} className={cn("flex items-start gap-3", message.sender === 'user' ? "justify-end" : "justify-start")}>
                                     {message.sender === 'bot' && (
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback><Bot /></AvatarFallback>
                                        </Avatar>
                                     )}
                                    <div className={cn("max-w-xs rounded-lg p-3 text-sm", message.sender === 'user' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                        <p>{message.text}</p>
                                    </div>
                                </div>
                            ))}
                             {isLoading && (
                                <div className="flex items-start gap-3 justify-start">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback><Bot /></AvatarFallback>
                                    </Avatar>
                                    <div className="bg-muted rounded-lg p-3">
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type your message..."
                                disabled={isLoading}
                                autoComplete="off"
                            />
                            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
