import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Box,
  Flex,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  VStack,
  HStack,
  Text,
  Badge,
  useToast,
} from '@chakra-ui/react';
import { MessageSquare, Mail, Send, Instagram } from 'lucide-react';
import { api } from '../../services/api';
import ConversationList from './ConversationList';
import MessageThread from './MessageThread';
import ComposeMessage from './ComposeMessage';
import BulkMessageManager from './BulkMessageManager';

interface Channel {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
}

const channels: Channel[] = [
  { id: 'unified', name: 'すべて', icon: MessageSquare, color: 'blue' },
  { id: 'sms', name: 'SMS', icon: MessageSquare, color: 'green' },
  { id: 'email', name: 'メール', icon: Mail, color: 'purple' },
  { id: 'line', name: 'LINE', icon: Send, color: 'green' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'pink' },
];

const MessageCenter: React.FC = () => {
  const [selectedChannel, setSelectedChannel] = useState('unified');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const toast = useToast();

  // Initialize messaging service
  useEffect(() => {
    api.post('/api/messaging/initialize').catch((error) => {
      console.error('Failed to initialize messaging service:', error);
    });
  }, []);

  // Fetch conversations
  const { data: conversationsData, refetch: refetchConversations } = useQuery({
    queryKey: ['conversations', selectedChannel],
    queryFn: async () => {
      const params = selectedChannel !== 'unified' ? { channel: selectedChannel } : {};
      const response = await api.get('/api/messaging/conversations', { params });
      return response.data.conversations;
    },
  });

  // Mark messages as read
  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      await api.post(`/api/messaging/conversations/${conversationId}/read`);
    },
    onSuccess: () => {
      refetchConversations();
    },
  });

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversation(conversationId);
    setIsComposing(false);
    markAsReadMutation.mutate(conversationId);
  };

  const handleNewMessage = () => {
    setIsComposing(true);
    setSelectedConversation(null);
  };

  const handleMessageSent = () => {
    setIsComposing(false);
    refetchConversations();
    toast({
      title: 'メッセージが送信されました',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Box h="calc(100vh - 64px)" bg="gray.50">
      <Tabs
        isLazy
        onChange={(index) => setSelectedChannel(channels[index].id)}
        colorScheme="blue"
        h="100%"
      >
        <TabList bg="white" borderBottom="1px" borderColor="gray.200">
          {channels.map((channel) => {
            const Icon = channel.icon;
            return (
              <Tab key={channel.id}>
                <HStack spacing={2}>
                  <Icon size={16} />
                  <Text>{channel.name}</Text>
                  {channel.id !== 'unified' && conversationsData && (
                    <Badge colorScheme={channel.color} size="sm">
                      {conversationsData.filter((c: any) => 
                        channel.id === 'unified' || c.channel === channel.id
                      ).reduce((acc: number, c: any) => acc + c.unreadCount, 0)}
                    </Badge>
                  )}
                </HStack>
              </Tab>
            );
          })}
          <Tab>
            <HStack spacing={2}>
              <Send size={16} />
              <Text>一括送信</Text>
            </HStack>
          </Tab>
        </TabList>

        <TabPanels h="calc(100% - 48px)">
          {channels.map((channel) => (
            <TabPanel key={channel.id} p={0} h="100%">
              <Flex h="100%">
                <Box w="350px" borderRight="1px" borderColor="gray.200" bg="white">
                  <ConversationList
                    channel={channel.id}
                    conversations={conversationsData || []}
                    selectedConversation={selectedConversation}
                    onSelect={handleConversationSelect}
                    onNewMessage={handleNewMessage}
                  />
                </Box>
                <Box flex={1} bg="white">
                  {isComposing ? (
                    <ComposeMessage
                      channel={selectedChannel === 'unified' ? undefined : selectedChannel}
                      onSent={handleMessageSent}
                      onCancel={() => setIsComposing(false)}
                    />
                  ) : selectedConversation ? (
                    <MessageThread
                      conversationId={selectedConversation}
                      onMessageSent={refetchConversations}
                    />
                  ) : (
                    <Flex
                      h="100%"
                      align="center"
                      justify="center"
                      color="gray.500"
                    >
                      <VStack spacing={4}>
                        <MessageSquare size={48} />
                        <Text fontSize="lg">会話を選択してください</Text>
                      </VStack>
                    </Flex>
                  )}
                </Box>
              </Flex>
            </TabPanel>
          ))}
          
          <TabPanel p={4} h="100%">
            <BulkMessageManager />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default MessageCenter;