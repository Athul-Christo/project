import React, { useState } from 'react';
import { 
  Download, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  Volume2,
  Image as ImageIcon,
  Video as VideoIcon,
  File as FileIcon
} from 'lucide-react';
import { format } from 'date-fns';

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

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onDelete?: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn, onDelete }) => {
  const [showActions, setShowActions] = useState(false);

  const getStatusIcon = () => {
    switch (message.moderation.status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'blocked':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (message.moderation.status) {
      case 'approved':
        return 'Approved';
      case 'blocked':
        return `Blocked: ${message.moderation.reason || 'Content violation'}`;
      case 'pending':
        return 'Processing...';
      case 'error':
        return 'Error processing';
      default:
        return '';
    }
  };

  const getMediaIcon = () => {
    switch (message.messageType) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'video':
        return <VideoIcon className="w-4 h-4" />;
      case 'audio':
        return <Volume2 className="w-4 h-4" />;
      case 'document':
        return <FileIcon className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative group ${
          isOwn
            ? message.moderation.status === 'blocked'
              ? 'bg-red-100 border border-red-200'
              : 'bg-blue-500 text-white'
            : message.moderation.status === 'blocked'
            ? 'bg-red-50 border border-red-200'
            : 'bg-white border border-gray-200'
        }`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Message content */}
        <div className="space-y-2">
          {/* Media preview */}
          {message.content.mediaUrl && (
            <div className="relative">
              {message.messageType === 'image' && (
                <img
                  src={message.content.mediaUrl}
                  alt="Media"
                  className="w-full h-32 object-cover rounded"
                />
              )}
              {message.messageType === 'video' && (
                <div className="relative w-full h-32 bg-gray-200 rounded flex items-center justify-center">
                  <VideoIcon className="w-8 h-8 text-gray-400" />
                  {message.content.duration && (
                    <span className="absolute bottom-2 right-2 text-xs bg-black bg-opacity-50 text-white px-1 rounded">
                      {formatDuration(message.content.duration)}
                    </span>
                  )}
                </div>
              )}
              {message.messageType === 'audio' && (
                <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded">
                  <Volume2 className="w-4 h-4" />
                  <span className="text-sm">
                    {message.content.duration ? formatDuration(message.content.duration) : 'Audio'}
                  </span>
                </div>
              )}
              {message.messageType === 'document' && (
                <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded">
                  <FileIcon className="w-4 h-4" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {message.content.fileName || 'Document'}
                    </p>
                    {message.content.fileSize && (
                      <p className="text-xs text-gray-500">
                        {formatFileSize(message.content.fileSize)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Text content */}
          {message.content.text && (
            <p className="text-sm whitespace-pre-wrap">{message.content.text}</p>
          )}

          {/* Transcription */}
          {message.transcription && (
            <div className="text-xs opacity-75 italic">
              <p className="font-medium">Transcription:</p>
              <p>{message.transcription.text}</p>
              <p className="text-xs opacity-50">
                Confidence: {Math.round(message.transcription.confidence * 100)}%
              </p>
            </div>
          )}

          {/* Moderation status */}
          {message.moderation.status !== 'approved' && (
            <div className="flex items-center space-x-2 text-xs">
              {getStatusIcon()}
              <span className={message.moderation.status === 'blocked' ? 'text-red-600' : 'text-yellow-600'}>
                {getStatusText()}
              </span>
            </div>
          )}

          {/* Moderation details */}
          {message.moderation.hateSpeech?.detected && (
            <div className="text-xs bg-red-50 p-2 rounded">
              <p className="font-medium text-red-700">Hate Speech Detected</p>
              <p className="text-red-600">
                Confidence: {Math.round(message.moderation.hateSpeech.confidence * 100)}%
              </p>
              <p className="text-red-600">
                Category: {message.moderation.hateSpeech.category}
              </p>
            </div>
          )}

          {message.moderation.contentModeration && (
            <div className="text-xs space-y-1">
              {message.moderation.contentModeration.nudity.detected && (
                <div className="bg-red-50 p-2 rounded">
                  <p className="font-medium text-red-700">Nudity Detected</p>
                  <p className="text-red-600">
                    Confidence: {Math.round(message.moderation.contentModeration.nudity.confidence * 100)}%
                  </p>
                </div>
              )}
              {message.moderation.contentModeration.violence.detected && (
                <div className="bg-red-50 p-2 rounded">
                  <p className="font-medium text-red-700">Violence Detected</p>
                  <p className="text-red-600">
                    Confidence: {Math.round(message.moderation.contentModeration.violence.confidence * 100)}%
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center justify-between text-xs opacity-75">
            <span>
              {format(new Date(message.metadata.timestamp), 'HH:mm')}
            </span>
            <div className="flex items-center space-x-1">
              {getMediaIcon()}
              <span>{message.messageType}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {showActions && (
          <div className="absolute top-2 right-2 flex space-x-1">
            {message.content.mediaUrl && (
              <button
                onClick={() => window.open(message.content.mediaUrl, '_blank')}
                className="p-1 bg-white bg-opacity-90 rounded-full shadow-sm hover:bg-opacity-100"
                title="Download"
              >
                <Download className="w-3 h-3" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1 bg-white bg-opacity-90 rounded-full shadow-sm hover:bg-opacity-100 text-red-500"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble; 