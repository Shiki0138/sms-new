import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Textarea,
  Select,
  FormControl,
  FormLabel,
  useToast,
  IconButton,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  List,
  ListItem,
  Avatar,
} from '@chakra-ui/react';
import { Search, Send, X, MessageSquare, Mail, Instagram } from 'lucide-react';
import { api } from '../../services/api';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  lineUserId?: string;
  instagramUsername?: string;
  channelPreferences: Record<string, boolean>;
}

interface ComposeMessageProps {
  channel?: string;
  customerId?: string;
  onSent: () => void;
  onCancel: () => void;
}

const channelInfo = {
  sms: { icon: MessageSquare, color: 'green', label: 'SMS' },
  email: { icon: Mail, color: 'purple', label: 'メール' },
  line: { icon: Send, color: 'green', label: 'LINE' },
  instagram: { icon: Instagram, color: 'pink', label: 'Instagram' },
};

const ComposeMessage: React.FC<ComposeMessageProps> = ({
  channel: initialChannel,
  customerId: initialCustomerId,
  onSent,
  onCancel,
}) => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedChannel, setSelectedChannel] = useState(initialChannel || 'sms');
  const [messageContent, setMessageContent] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(!initialCustomerId);
  const toast = useToast();

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ['customers', searchQuery],
    queryFn: async () => {
      const response = await api.get('/api/customers', {
        params: { search: searchQuery, limit: 20 },
      });
      return response.data.customers;
    },
    enabled: isCustomerModalOpen,
  });

  // Fetch specific customer if ID provided
  useQuery({
    queryKey: ['customer', initialCustomerId],
    queryFn: async () => {
      const response = await api.get(`/api/customers/${initialCustomerId}`);
      setSelectedCustomer(response.data);
      return response.data;
    },
    enabled: !!initialCustomerId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: {
      customerId: string;
      channel: string;
      content: any;
    }) => {
      const response = await api.post('/api/messaging/send', data);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'メッセージを送信しました',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onSent();
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
  });

  const handleSend = () => {
    if (!selectedCustomer || !messageContent.trim()) return;

    let content: any = messageContent;
    if (selectedChannel === 'email') {
      content = {
        subject: emailSubject || 'サロンからのお知らせ',
        text: messageContent,
        html: `<p>${messageContent.replace(/\n/g, '<br>')}</p>`,
      };
    }

    sendMessageMutation.mutate({
      customerId: selectedCustomer.id,
      channel: selectedChannel,
      content,
    });
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsCustomerModalOpen(false);

    // Find best available channel
    const availableChannels = Object.entries(customer.channelPreferences)
      .filter(([channel, enabled]) => enabled && hasChannelIdentifier(customer, channel))
      .map(([channel]) => channel);

    if (availableChannels.length > 0 && !availableChannels.includes(selectedChannel)) {
      setSelectedChannel(availableChannels[0]);
    }
  };

  const hasChannelIdentifier = (customer: Customer, channel: string) => {
    switch (channel) {
      case 'sms':
        return !!customer.phoneNumber;
      case 'email':
        return !!customer.email;
      case 'line':
        return !!customer.lineUserId;
      case 'instagram':
        return !!customer.instagramUsername;
      default:
        return false;
    }
  };

  const getChannelIdentifier = (customer: Customer, channel: string) => {
    switch (channel) {
      case 'sms':
        return customer.phoneNumber;
      case 'email':
        return customer.email;
      case 'line':
        return 'LINE連携済み';
      case 'instagram':
        return `@${customer.instagramUsername}`;
      default:
        return '';
    }
  };

  return (
    <>
      <VStack h="100%" p={6} spacing={4} align="stretch">
        <HStack justify="space-between">
          <Text fontSize="xl" fontWeight="bold">新規メッセージ</Text>
          <IconButton
            aria-label="Cancel"
            icon={<X />}
            variant="ghost"
            onClick={onCancel}
          />
        </HStack>

        {/* Customer Selection */}
        <FormControl>
          <FormLabel>宛先</FormLabel>
          {selectedCustomer ? (
            <HStack
              p={3}
              borderWidth={1}
              borderRadius="md"
              justify="space-between"
            >
              <HStack>
                <Avatar
                  size="sm"
                  name={`${selectedCustomer.firstName} ${selectedCustomer.lastName}`}
                />
                <VStack align="start" spacing={0}>
                  <Text fontWeight="medium">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {getChannelIdentifier(selectedCustomer, selectedChannel)}
                  </Text>
                </VStack>
              </HStack>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedCustomer(null);
                  setIsCustomerModalOpen(true);
                }}
              >
                変更
              </Button>
            </HStack>
          ) : (
            <Button
              variant="outline"
              onClick={() => setIsCustomerModalOpen(true)}
              w="100%"
              justifyContent="start"
            >
              顧客を選択...
            </Button>
          )}
        </FormControl>

        {/* Channel Selection */}
        {selectedCustomer && (
          <FormControl>
            <FormLabel>チャネル</FormLabel>
            <Select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
            >
              {Object.entries(channelInfo)
                .filter(([channel]) =>
                  selectedCustomer.channelPreferences[channel] &&
                  hasChannelIdentifier(selectedCustomer, channel)
                )
                .map(([channel, info]) => {
                  const Icon = info.icon;
                  return (
                    <option key={channel} value={channel}>
                      {info.label}
                    </option>
                  );
                })}
            </Select>
          </FormControl>
        )}

        {/* Email Subject */}
        {selectedChannel === 'email' && (
          <FormControl>
            <FormLabel>件名</FormLabel>
            <Input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="メールの件名"
            />
          </FormControl>
        )}

        {/* Message Content */}
        <FormControl flex={1}>
          <FormLabel>メッセージ</FormLabel>
          <Textarea
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            placeholder="メッセージを入力してください..."
            h="100%"
            resize="none"
          />
        </FormControl>

        {/* Send Button */}
        <Button
          colorScheme="blue"
          leftIcon={<Send size={16} />}
          onClick={handleSend}
          isLoading={sendMessageMutation.isLoading}
          isDisabled={!selectedCustomer || !messageContent.trim()}
        >
          送信
        </Button>
      </VStack>

      {/* Customer Selection Modal */}
      <Modal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>顧客を選択</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <InputGroup>
                <InputLeftElement>
                  <Search size={16} />
                </InputLeftElement>
                <Input
                  placeholder="名前、電話番号、メールアドレスで検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </InputGroup>

              <List spacing={2} maxH="400px" overflowY="auto">
                {customers?.map((customer: Customer) => (
                  <ListItem
                    key={customer.id}
                    p={3}
                    borderRadius="md"
                    cursor="pointer"
                    _hover={{ bg: 'gray.50' }}
                    onClick={() => handleCustomerSelect(customer)}
                  >
                    <HStack>
                      <Avatar
                        size="sm"
                        name={`${customer.firstName} ${customer.lastName}`}
                      />
                      <VStack align="start" spacing={0} flex={1}>
                        <Text fontWeight="medium">
                          {customer.firstName} {customer.lastName}
                        </Text>
                        <HStack spacing={4} fontSize="sm" color="gray.600">
                          {customer.phoneNumber && <Text>📱 {customer.phoneNumber}</Text>}
                          {customer.email && <Text>✉️ {customer.email}</Text>}
                        </HStack>
                      </VStack>
                    </HStack>
                  </ListItem>
                ))}
              </List>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setIsCustomerModalOpen(false)}>
              キャンセル
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ComposeMessage;