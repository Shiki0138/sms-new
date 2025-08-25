import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  Select,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  Alert,
  AlertIcon,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Divider,
  Switch,
  Code,
} from '@chakra-ui/react';
import { Eye, EyeOff, Save, TestTube, Copy, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../../services/api';

interface ChannelConfig {
  channel: string;
  provider: string;
  config: Record<string, any>;
  isActive: boolean;
  isVerified: boolean;
  lastTestAt?: string;
  webhookUrl?: string;
  webhookSecret?: string;
}

const channelDetails = {
  sms: {
    name: 'SMS',
    providers: [{ value: 'twilio', label: 'Twilio' }],
    fields: [
      { key: 'accountSid', label: 'Account SID', type: 'text', required: true },
      { key: 'authToken', label: 'Auth Token', type: 'password', required: true },
      { key: 'phoneNumber', label: '送信元電話番号', type: 'text', required: true, placeholder: '+81XXXXXXXXX' },
      { key: 'messagingServiceSid', label: 'Messaging Service SID (オプション)', type: 'text', required: false },
    ],
  },
  email: {
    name: 'メール',
    providers: [{ value: 'sendgrid', label: 'SendGrid' }],
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'fromEmail', label: '送信元メールアドレス', type: 'email', required: true },
      { key: 'fromName', label: '送信者名', type: 'text', required: false },
      { key: 'domain', label: 'ドメイン (オプション)', type: 'text', required: false },
    ],
  },
  line: {
    name: 'LINE',
    providers: [{ value: 'line-api', label: 'LINE Messaging API' }],
    fields: [
      { key: 'channelAccessToken', label: 'Channel Access Token', type: 'password', required: true },
      { key: 'channelSecret', label: 'Channel Secret', type: 'password', required: true },
      { key: 'channelId', label: 'Channel ID', type: 'text', required: false },
    ],
  },
  instagram: {
    name: 'Instagram',
    providers: [{ value: 'instagram-api', label: 'Instagram Messaging API' }],
    fields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
      { key: 'businessAccountId', label: 'Business Account ID', type: 'text', required: true },
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'password', required: false },
    ],
  },
};

const ChannelConfigSettings: React.FC = () => {
  const [selectedChannel, setSelectedChannel] = useState<keyof typeof channelDetails>('sms');
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<Record<string, any>>({});
  const toast = useToast();

  // Fetch channel configurations
  const { data: configs, refetch } = useQuery({
    queryKey: ['channel-configs'],
    queryFn: async () => {
      const response = await api.get('/api/channel-config');
      return response.data.configs;
    },
  });

  // Load existing config when channel changes
  React.useEffect(() => {
    const existingConfig = configs?.find((c: ChannelConfig) => c.channel === selectedChannel);
    if (existingConfig) {
      setFormData({
        provider: existingConfig.provider,
        ...existingConfig.config,
      });
    } else {
      setFormData({
        provider: channelDetails[selectedChannel].providers[0].value,
      });
    }
  }, [selectedChannel, configs]);

  // Save configuration
  const saveMutation = useMutation({
    mutationFn: async (data: { channel: string; provider: string; config: Record<string, any> }) => {
      const response = await api.post(`/api/channel-config/${data.channel}`, {
        provider: data.provider,
        config: data.config,
      });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: '設定を保存しました',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: '設定の保存に失敗しました',
        description: error.response?.data?.error || error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  // Test configuration
  const testMutation = useMutation({
    mutationFn: async (channel: string) => {
      const response = await api.post(`/api/channel-config/${channel}/test`);
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: '接続テスト成功',
        description: data.message,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: '接続テスト失敗',
        description: error.response?.data?.error || error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const handleSave = () => {
    const channelConfig = channelDetails[selectedChannel];
    const config: Record<string, any> = {};

    // Extract config fields
    channelConfig.fields.forEach((field) => {
      if (formData[field.key]) {
        config[field.key] = formData[field.key];
      }
    });

    saveMutation.mutate({
      channel: selectedChannel,
      provider: formData.provider,
      config,
    });
  };

  const handleTest = () => {
    testMutation.mutate(selectedChannel);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'コピーしました',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const existingConfig = configs?.find((c: ChannelConfig) => c.channel === selectedChannel);

  return (
    <Box maxW="1200px" mx="auto" p={6}>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="md" mb={2}>API連携設定</Heading>
          <Text color="gray.600">各チャネルのAPI設定を管理します</Text>
        </Box>

        <Tabs
          index={Object.keys(channelDetails).indexOf(selectedChannel)}
          onChange={(index) => setSelectedChannel(Object.keys(channelDetails)[index] as keyof typeof channelDetails)}
        >
          <TabList>
            {Object.entries(channelDetails).map(([key, details]) => {
              const config = configs?.find((c: ChannelConfig) => c.channel === key);
              return (
                <Tab key={key}>
                  <HStack spacing={2}>
                    <Text>{details.name}</Text>
                    {config && (
                      <Badge colorScheme={config.isVerified ? 'green' : 'gray'} size="sm">
                        {config.isVerified ? '接続済み' : '未接続'}
                      </Badge>
                    )}
                  </HStack>
                </Tab>
              );
            })}
          </TabList>

          <TabPanels>
            {Object.entries(channelDetails).map(([channelKey, channelConfig]) => (
              <TabPanel key={channelKey}>
                <Card>
                  <CardHeader>
                    <HStack justify="space-between">
                      <Heading size="sm">{channelConfig.name}設定</Heading>
                      {existingConfig && (
                        <HStack spacing={2}>
                          {existingConfig.isVerified ? (
                            <Badge colorScheme="green" leftIcon={<CheckCircle size={14} />}>
                              検証済み
                            </Badge>
                          ) : (
                            <Badge colorScheme="gray" leftIcon={<XCircle size={14} />}>
                              未検証
                            </Badge>
                          )}
                          <Switch
                            isChecked={existingConfig.isActive}
                            isDisabled
                          >
                            有効
                          </Switch>
                        </HStack>
                      )}
                    </HStack>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <FormControl>
                        <FormLabel>プロバイダー</FormLabel>
                        <Select
                          value={formData.provider}
                          onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                        >
                          {channelConfig.providers.map((provider) => (
                            <option key={provider.value} value={provider.value}>
                              {provider.label}
                            </option>
                          ))}
                        </Select>
                      </FormControl>

                      {channelConfig.fields.map((field) => (
                        <FormControl key={field.key} isRequired={field.required}>
                          <FormLabel>{field.label}</FormLabel>
                          <InputGroup>
                            <Input
                              type={field.type === 'password' && !showSecrets[field.key] ? 'password' : 'text'}
                              placeholder={field.placeholder}
                              value={formData[field.key] || ''}
                              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                            />
                            {field.type === 'password' && (
                              <InputRightElement>
                                <IconButton
                                  aria-label="Toggle password visibility"
                                  icon={showSecrets[field.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setShowSecrets({
                                    ...showSecrets,
                                    [field.key]: !showSecrets[field.key],
                                  })}
                                />
                              </InputRightElement>
                            )}
                          </InputGroup>
                        </FormControl>
                      ))}

                      {existingConfig?.webhookUrl && (
                        <Box>
                          <Divider my={4} />
                          <VStack spacing={3} align="stretch">
                            <Text fontWeight="medium">Webhook設定</Text>
                            <FormControl>
                              <FormLabel>Webhook URL</FormLabel>
                              <InputGroup>
                                <Input value={existingConfig.webhookUrl} isReadOnly />
                                <InputRightElement>
                                  <IconButton
                                    aria-label="Copy webhook URL"
                                    icon={<Copy size={16} />}
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => copyToClipboard(existingConfig.webhookUrl!)}
                                  />
                                </InputRightElement>
                              </InputGroup>
                            </FormControl>
                            {existingConfig.webhookSecret && (
                              <Alert status="info" size="sm">
                                <AlertIcon />
                                <Text fontSize="sm">
                                  Webhook Secret: <Code>{existingConfig.webhookSecret}</Code>
                                </Text>
                              </Alert>
                            )}
                          </VStack>
                        </Box>
                      )}

                      <HStack pt={4}>
                        <Button
                          leftIcon={<Save size={16} />}
                          colorScheme="blue"
                          onClick={handleSave}
                          isLoading={saveMutation.isLoading}
                        >
                          保存
                        </Button>
                        <Button
                          leftIcon={<TestTube size={16} />}
                          variant="outline"
                          onClick={handleTest}
                          isLoading={testMutation.isLoading}
                          isDisabled={!existingConfig}
                        >
                          接続テスト
                        </Button>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </VStack>
    </Box>
  );
};

export default ChannelConfigSettings;