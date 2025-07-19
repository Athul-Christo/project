import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Mic, Image, Video, File, Download, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import MessageBubble from '../components/MessageBubble';
import MediaPreview from '../components/MediaPreview';
import LoadingSpinner from '../components/LoadingSpinner';

interface Message {
  _id: string;
  whatsappMessageId: string;
  from: string;
  to: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document';
  content: {
    text?: string;
    mediaUrl?: string;
    mediaId?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    duration?: number;
    thumbnailUrl?: string;
  };
  transcription?: {
    text: string;
    confidence: number;
    language: string;
  };
  moderation: {
    status: 'pending' | 'approved' | 'blocked' | 'error';
    reason?: string;
    hateSpeech?: {
      detected: boolean;
      confidence: number;
      category: string;
    };
    contentModeration?: {
      nudity: { detected: boolean; confidence: number; category: string };
      violence: { detected: boolean; confidence: number; category: string };
      explicit: { detected: boolean; confidence: number; category: string };
    };
  };
  metadata: {
    timestamp: string;
    direction: 'inbound' | 'outbound';
    status: string;
  };
  createdAt: string;
}

const Chat: React.FC = () => {
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load messages on component mount
  useEffect(() => {
    loadMessages();
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for real-time messages
  useEffect(() => {
    if (!socket) return;

    socket.on('new_message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('message_blocked', (data: { messageId: string; reason: string }) => {
      setMessages(prev => 
        prev.map(msg => 
          msg.whatsappMessageId === data.messageId 
            ? { ...msg, moderation: { ...msg.moderation, status: 'blocked', reason: data.reason } }
            : msg
        )
      );
    });

    return () => {
      socket.off('new_message');
      socket.off('message_blocked');
    };
  }, [socket]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/messages', {
        params: {
          limit: 50,
          offset: 0
        }
      });
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;

    try {
      setSending(true);

      if (selectedFile) {
        await sendMediaMessage(selectedFile);
      } else {
        await sendTextMessage(newMessage);
      }

      setNewMessage('');
      setSelectedFile(null);
      setShowMediaPreview(false);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const sendTextMessage = async (text: string) => {
    const response = await axios.post('/api/messages/send', {
      to: user?.whatsappNumber,
      type: 'text',
      content: text
    });

    if (response.data.success) {
      toast.success('Message sent successfully');
    }
  };

  const sendMediaMessage = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('to', user?.whatsappNumber || '');
    formData.append('type', getMediaType(file));

    const response = await axios.post('/api/messages/send-media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    if (response.data.success) {
      toast.success('Media message sent successfully');
    }
  };

  const getMediaType = (file: File): string => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowMediaPreview(true);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleExportChat = async () => {
    try {
      const response = await axios.get('/api/messages/export', {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `chat-export-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Chat exported successfully');
    } catch (error) {
      console.error('Failed to export chat:', error);
      toast.error('Failed to export chat');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await axios.delete(`/api/messages/${messageId}`);
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      toast.success('Message deleted successfully');
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">WhatsApp Chat</h1>
            <p className="text-sm text-gray-500">
              {connected ? 'Connected' : 'Disconnected'} • {messages.length} messages
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportChat}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message._id}
            message={message}
            isOwn={message.metadata.direction === 'outbound'}
            onDelete={() => handleDeleteMessage(message._id)}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Media Preview */}
      {showMediaPreview && selectedFile && (
        <div className="bg-white border-t border-gray-200 p-4">
          <MediaPreview
            file={selectedFile}
            onRemove={() => {
              setSelectedFile(null);
              setShowMediaPreview(false);
            }}
          />
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center space-x-2">
          {/* File Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <Image className="w-5 h-5" />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <Video className="w-5 h-5" />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <File className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={1}
              disabled={sending}
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && !selectedFile) || sending}
            className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat; 