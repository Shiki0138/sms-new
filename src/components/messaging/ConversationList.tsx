import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Avatar,
  Badge,
  Input,
  InputGroup,
  InputLeftElement,
  IconButton,
  Flex,
  Button,
} from '@chakra-ui/react';
import { Search, Plus, MessageSquare, Mail, Send, Instagram } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Conversation {
  id: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phoneNumber?: string;
  };
  channel: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
  isPinned: boolean;
}

interface ConversationListProps {
  channel: string;
  conversations: Conversation[];
  selectedConversation: string | null;
  onSelect: (conversationId: string) => void;
  onNewMessage: () => void;
}

const channelIcons: Record<string, React.ElementType> = {
  sms: MessageSquare,
  email: Mail,
  line: Send,
  instagram: Instagram,
};

const channelColors: Record<string, string> = {
  sms: 'green',
  email: 'purple',
  line: 'green',
  instagram: 'pink',
};

const ConversationList: React.FC<ConversationListProps> = ({
  channel,
  conversations,
  selectedConversation,
  onSelect,
  onNewMessage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter((conv) => {
    if (channel !== 'unified' && conv.channel !== channel) return false;
    
    if (searchQuery) {
      const customer = conv.customer;
      const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
      const query = searchQuery.toLowerCase();
      
      return (
        fullName.includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.phoneNumber?.includes(query) ||
        conv.lastMessagePreview.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
  });

  return (
    <VStack h="100%" spacing={0}>
      {/* Header */}
      <Box w="100%" p={4} borderBottom="1px" borderColor="gray.200">
        <HStack spacing={3} mb={3}>
          <Text fontSize="lg" fontWeight="bold" flex={1}>
            メッセージ
          </Text>
          <Button
            size="sm"
            leftIcon={<Plus size={16} />}
            colorScheme="blue"
            onClick={onNewMessage}
          >
            新規作成
          </Button>
        </HStack>
        <InputGroup size="sm">
          <InputLeftElement>
            <Search size={16} />
          </InputLeftElement>
          <Input
            placeholder="検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </InputGroup>
      </Box>

      {/* Conversation List */}
      <Box flex={1} overflowY="auto">
        <VStack spacing={0} align="stretch">
          {sortedConversations.length === 0 ? (
            <Flex p={8} justify="center" align="center" color="gray.500">
              <VStack spacing={2}>
                <MessageSquare size={32} />
                <Text>会話がありません</Text>
              </VStack>
            </Flex>
          ) : (
            sortedConversations.map((conversation) => {
              const Icon = channelIcons[conversation.channel] || MessageSquare;
              const isSelected = selectedConversation === conversation.id;
              
              return (
                <Box
                  key={conversation.id}
                  px={4}
                  py={3}
                  cursor="pointer"
                  bg={isSelected ? 'blue.50' : 'white'}
                  borderLeft="3px solid"
                  borderLeftColor={isSelected ? 'blue.500' : 'transparent'}
                  _hover={{ bg: isSelected ? 'blue.50' : 'gray.50' }}
                  onClick={() => onSelect(conversation.id)}
                >
                  <HStack spacing={3} align="start">
                    <Avatar
                      size="md"
                      name={`${conversation.customer.firstName} ${conversation.customer.lastName}`}
                    />
                    <VStack align="start" flex={1} spacing={1}>
                      <HStack w="100%" justify="space-between">
                        <HStack spacing={2}>
                          <Text fontWeight="medium" fontSize="sm">
                            {conversation.customer.firstName} {conversation.customer.lastName}
                          </Text>
                          {conversation.unreadCount > 0 && (
                            <Badge colorScheme="red" size="sm">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </HStack>
                        <Text fontSize="xs" color="gray.500">
                          {format(new Date(conversation.lastMessageAt), 'M/d HH:mm', { locale: ja })}
                        </Text>
                      </HStack>
                      <HStack spacing={2} w="100%">
                        <Icon size={14} color={`var(--chakra-colors-${channelColors[conversation.channel]}-500)`} />
                        <Text
                          fontSize="sm"
                          color="gray.600"
                          noOfLines={1}
                          flex={1}
                        >
                          {conversation.lastMessagePreview}
                        </Text>
                      </HStack>
                    </VStack>
                  </HStack>
                </Box>
              );
            })
          )}
        </VStack>
      </Box>
    </VStack>
  );
};

export default ConversationList;