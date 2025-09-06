import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Box,
  VStack,
  HStack,
  Text,
  Avatar,
  Flex,
  Input,
  IconButton,
  Textarea,
  useToast,
  Spinner,
  Badge,
} from '@chakra-ui/react';
import { Send, Paperclip, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { api } from '../../services/api';

interface Message {
  id: string;
  content: string;
  direction: 'inbound' | 'outbound';
  status: string;
  createdAt: string;
  messageType: string;
  mediaUrl?: string;
  emailSubject?: string;
  customer?: {
    firstName: string;
    lastName: string;
  };
}

interface MessageThreadProps {
  conversationId: string;
  onMessageSent: () => void;
}

const MessageThread: React.FC<MessageThreadProps> = ({ conversationId, onMessageSent }) => {
  const [messageContent, setMessageContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Fetch messages
  const { data: messages, isLoading, refetch } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const response = await api.get(`/api/messaging/conversations/${conversationId}/messages`);
      return response.data.messages;
    },
    refetchInterval: 5000, // Poll for new messages every 5 seconds
  });

  // Fetch conversation details
  const { data: conversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      const response = await api.get('/api/messaging/conversations', {
        params: { limit: 1 },
      });
      return response.data.conversations.find((c: any) => c.id === conversationId);
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string }) => {
      if (!conversation) throw new Error('Conversation not found');
      
      const response = await api.post('/api/messaging/send', {
        customerId: conversation.customer.id,
        channel: conversation.channel,
        content: data.content,
      });
      return response.data;
    },
    onSuccess: () => {
      setMessageContent('');
      refetch();
      onMessageSent();
    },
    onError: (error: any) => {
      toast({
        title: 'メッセージの送信に失敗しました',
        description: error.response?.data?.error || error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
    onSettled: () => {
      setIsSending(false);
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageContent.trim() || isSending) return;
    
    setIsSending(true);
    sendMessageMutation.mutate({ content: messageContent });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <Flex h="100%" align="center" justify="center">
        <Spinner size="lg" color="blue.500" />
      </Flex>
    );
  }

  return (
    <VStack h="100%" spacing={0}>
      {/* Header */}
      <Box w="100%" p={4} borderBottom="1px" borderColor="gray.200">
        <HStack spacing={3}>
          <Avatar
            size="sm"
            name={conversation ? `${conversation.customer.firstName} ${conversation.customer.lastName}` : ''}
          />
          <VStack align="start" spacing={0}>
            <Text fontWeight="medium">
              {conversation ? `${conversation.customer.firstName} ${conversation.customer.lastName}` : 'Loading...'}
            </Text>
            <HStack spacing={2}>
              <Badge colorScheme="blue" size="sm">
                {conversation?.channel.toUpperCase()}
              </Badge>
              <Text fontSize="xs" color="gray.500">
                {conversation?.channelIdentifier}
              </Text>
            </HStack>
          </VStack>
        </HStack>
      </Box>

      {/* Messages */}
      <Box flex={1} overflowY="auto" p={4}>
        <VStack spacing={4} align="stretch">
          {messages?.map((message: Message) => (
            <Flex
              key={message.id}
              justify={message.direction === 'outbound' ? 'flex-end' : 'flex-start'}
            >
              <Box
                maxW="70%"
                bg={message.direction === 'outbound' ? 'blue.500' : 'gray.100'}
                color={message.direction === 'outbound' ? 'white' : 'black'}
                px={4}
                py={2}
                borderRadius="lg"
                borderBottomRightRadius={message.direction === 'outbound' ? 0 : 'lg'}
                borderBottomLeftRadius={message.direction === 'inbound' ? 0 : 'lg'}
              >
                {message.emailSubject && (
                  <Text fontWeight="bold" fontSize="sm" mb={1}>
                    {message.emailSubject}
                  </Text>
                )}
                <Text whiteSpace="pre-wrap">{message.content}</Text>
                <HStack mt={1} spacing={2}>
                  <Text fontSize="xs" opacity={0.8}>
                    {format(new Date(message.createdAt), 'HH:mm', { locale: ja })}
                  </Text>
                  {message.direction === 'outbound' && (
                    <Badge
                      size="xs"
                      colorScheme={
                        message.status === 'delivered' ? 'green' :
                        message.status === 'sent' ? 'blue' :
                        message.status === 'failed' ? 'red' : 'gray'
                      }
                    >
                      {message.status}
                    </Badge>
                  )}
                </HStack>
              </Box>
            </Flex>
          ))}
          <div ref={messagesEndRef} />
        </VStack>
      </Box>

      {/* Input */}
      <Box w="100%" p={4} borderTop="1px" borderColor="gray.200">
        <HStack spacing={2}>
          <IconButton
            aria-label="Attach file"
            icon={<Paperclip size={20} />}
            variant="ghost"
            isDisabled
          />
          <IconButton
            aria-label="Attach image"
            icon={<ImageIcon size={20} />}
            variant="ghost"
            isDisabled
          />
          <Textarea
            placeholder="メッセージを入力..."
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={1}
            resize="none"
            flex={1}
          />
          <IconButton
            aria-label="Send message"
            icon={<Send size={20} />}
            colorScheme="blue"
            onClick={handleSendMessage}
            isLoading={isSending}
            isDisabled={!messageContent.trim()}
          />
        </HStack>
      </Box>
    </VStack>
  );
};

export default MessageThread;