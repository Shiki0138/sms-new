import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Progress,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Checkbox,
  CheckboxGroup,
  Stack,
  Select,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
} from '@chakra-ui/react';
import { Send, Clock, CheckCircle, XCircle, Eye, Play, Pause } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { api } from '../../services/api';

interface BulkJob {
  id: string;
  name: string;
  channels: string[];
  recipientCount: number;
  status: string;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  statistics: {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
  };
}

const BulkMessageManager: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<BulkJob | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    channels: [] as string[],
    recipientFilter: {
      tags: [] as string[],
    },
    messageContent: {
      sms: '',
      email: { subject: '', text: '' },
      line: '',
      instagram: '',
    },
    scheduledAt: '',
  });
  const toast = useToast();

  // Fetch job history
  const { data: jobs, refetch } = useQuery({
    queryKey: ['bulk-jobs'],
    queryFn: async () => {
      const response = await api.get('/api/messaging/bulk/history');
      return response.data.jobs;
    },
  });

  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/messaging/bulk/create', data);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: '一括送信ジョブを作成しました',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setIsCreateModalOpen(false);
      refetch();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'ジョブの作成に失敗しました',
        description: error.response?.data?.error || error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  // Start job mutation
  const startJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await api.post(`/api/messaging/bulk/${jobId}/start`);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'ジョブを開始しました',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      refetch();
    },
  });

  // Cancel job mutation
  const cancelJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await api.post(`/api/messaging/bulk/${jobId}/cancel`);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'ジョブをキャンセルしました',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      refetch();
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      channels: [],
      recipientFilter: { tags: [] },
      messageContent: {
        sms: '',
        email: { subject: '', text: '' },
        line: '',
        instagram: '',
      },
      scheduledAt: '',
    });
  };

  const handleCreateJob = () => {
    // Format message content based on selected channels
    const messageContent: any = {};
    formData.channels.forEach((channel) => {
      if (channel === 'email') {
        messageContent[channel] = formData.messageContent.email;
      } else {
        messageContent[channel] = formData.messageContent[channel as keyof typeof formData.messageContent];
      }
    });

    createJobMutation.mutate({
      ...formData,
      messageContent,
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { colorScheme: 'gray', label: '下書き' },
      scheduled: { colorScheme: 'blue', label: '予約済み' },
      processing: { colorScheme: 'yellow', label: '送信中' },
      completed: { colorScheme: 'green', label: '完了' },
      failed: { colorScheme: 'red', label: '失敗' },
      cancelled: { colorScheme: 'gray', label: 'キャンセル' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge colorScheme={config.colorScheme}>{config.label}</Badge>;
  };

  return (
    <VStack spacing={6} align="stretch" h="100%">
      <HStack justify="space-between">
        <Box>
          <Text fontSize="2xl" fontWeight="bold">一括メッセージ送信</Text>
          <Text color="gray.600">複数の顧客に一括でメッセージを送信</Text>
        </Box>
        <Button
          colorScheme="blue"
          leftIcon={<Send size={16} />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          新規作成
        </Button>
      </HStack>

      <Tabs>
        <TabList>
          <Tab>実行中</Tab>
          <Tab>履歴</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <VStack spacing={4} align="stretch">
              {jobs?.filter((job: BulkJob) => ['processing', 'scheduled'].includes(job.status)).map((job: BulkJob) => (
                <Box key={job.id} p={4} borderWidth={1} borderRadius="md">
                  <HStack justify="space-between" mb={3}>
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="bold">{job.name}</Text>
                      <HStack spacing={2}>
                        {getStatusBadge(job.status)}
                        <Text fontSize="sm" color="gray.600">
                          {job.recipientCount}件の宛先
                        </Text>
                      </HStack>
                    </VStack>
                    {job.status === 'processing' && (
                      <Button
                        size="sm"
                        colorScheme="red"
                        leftIcon={<Pause size={14} />}
                        onClick={() => cancelJobMutation.mutate(job.id)}
                      >
                        キャンセル
                      </Button>
                    )}
                  </HStack>

                  {job.status === 'processing' && (
                    <>
                      <Progress
                        value={(job.statistics.sent / job.statistics.total) * 100}
                        mb={2}
                        colorScheme="blue"
                      />
                      <SimpleGrid columns={4} spacing={2}>
                        <Stat size="sm">
                          <StatLabel>送信済み</StatLabel>
                          <StatNumber>{job.statistics.sent}</StatNumber>
                        </Stat>
                        <Stat size="sm">
                          <StatLabel>配信済み</StatLabel>
                          <StatNumber>{job.statistics.delivered}</StatNumber>
                        </Stat>
                        <Stat size="sm">
                          <StatLabel>失敗</StatLabel>
                          <StatNumber>{job.statistics.failed}</StatNumber>
                        </Stat>
                        <Stat size="sm">
                          <StatLabel>進行率</StatLabel>
                          <StatNumber>
                            {Math.round((job.statistics.sent / job.statistics.total) * 100)}%
                          </StatNumber>
                        </Stat>
                      </SimpleGrid>
                    </>
                  )}
                </Box>
              ))}

              {jobs?.filter((job: BulkJob) => ['processing', 'scheduled'].includes(job.status)).length === 0 && (
                <Box p={8} textAlign="center" color="gray.500">
                  <Text>実行中のジョブはありません</Text>
                </Box>
              )}
            </VStack>
          </TabPanel>

          <TabPanel>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>ジョブ名</Th>
                  <Th>チャネル</Th>
                  <Th>宛先数</Th>
                  <Th>ステータス</Th>
                  <Th>実行日時</Th>
                  <Th>アクション</Th>
                </Tr>
              </Thead>
              <Tbody>
                {jobs?.map((job: BulkJob) => (
                  <Tr key={job.id}>
                    <Td>{job.name}</Td>
                    <Td>
                      <HStack spacing={1}>
                        {job.channels.map((channel) => (
                          <Badge key={channel} size="sm">
                            {channel.toUpperCase()}
                          </Badge>
                        ))}
                      </HStack>
                    </Td>
                    <Td>{job.recipientCount}</Td>
                    <Td>{getStatusBadge(job.status)}</Td>
                    <Td>
                      {job.completedAt ? (
                        format(new Date(job.completedAt), 'yyyy/MM/dd HH:mm', { locale: ja })
                      ) : job.scheduledAt ? (
                        <HStack spacing={1}>
                          <Clock size={14} />
                          <Text fontSize="sm">
                            {format(new Date(job.scheduledAt), 'MM/dd HH:mm', { locale: ja })}
                          </Text>
                        </HStack>
                      ) : (
                        '-'
                      )}
                    </Td>
                    <Td>
                      <HStack spacing={2}>
                        {job.status === 'draft' && (
                          <Button
                            size="sm"
                            leftIcon={<Play size={14} />}
                            onClick={() => startJobMutation.mutate(job.id)}
                          >
                            開始
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<Eye size={14} />}
                          onClick={() => setSelectedJob(job)}
                        >
                          詳細
                        </Button>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Create Job Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        size="xl"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>新規一括送信ジョブ</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>ジョブ名</FormLabel>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例: 月末キャンペーンのお知らせ"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>送信チャネル</FormLabel>
                <CheckboxGroup
                  value={formData.channels}
                  onChange={(values) => setFormData({ ...formData, channels: values as string[] })}
                >
                  <Stack direction="row" spacing={4}>
                    <Checkbox value="sms">SMS</Checkbox>
                    <Checkbox value="email">メール</Checkbox>
                    <Checkbox value="line">LINE</Checkbox>
                    <Checkbox value="instagram">Instagram</Checkbox>
                  </Stack>
                </CheckboxGroup>
              </FormControl>

              <FormControl>
                <FormLabel>予約送信（オプション）</FormLabel>
                <Input
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                />
              </FormControl>

              {formData.channels.includes('sms') && (
                <FormControl>
                  <FormLabel>SMSメッセージ</FormLabel>
                  <Textarea
                    value={formData.messageContent.sms}
                    onChange={(e) => setFormData({
                      ...formData,
                      messageContent: { ...formData.messageContent, sms: e.target.value }
                    })}
                    placeholder="SMSメッセージを入力..."
                  />
                </FormControl>
              )}

              {formData.channels.includes('email') && (
                <>
                  <FormControl>
                    <FormLabel>メール件名</FormLabel>
                    <Input
                      value={formData.messageContent.email.subject}
                      onChange={(e) => setFormData({
                        ...formData,
                        messageContent: {
                          ...formData.messageContent,
                          email: { ...formData.messageContent.email, subject: e.target.value }
                        }
                      })}
                      placeholder="メールの件名"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>メール本文</FormLabel>
                    <Textarea
                      value={formData.messageContent.email.text}
                      onChange={(e) => setFormData({
                        ...formData,
                        messageContent: {
                          ...formData.messageContent,
                          email: { ...formData.messageContent.email, text: e.target.value }
                        }
                      })}
                      placeholder="メール本文を入力..."
                      rows={5}
                    />
                  </FormControl>
                </>
              )}

              {formData.channels.includes('line') && (
                <FormControl>
                  <FormLabel>LINEメッセージ</FormLabel>
                  <Textarea
                    value={formData.messageContent.line}
                    onChange={(e) => setFormData({
                      ...formData,
                      messageContent: { ...formData.messageContent, line: e.target.value }
                    })}
                    placeholder="LINEメッセージを入力..."
                  />
                </FormControl>
              )}

              {formData.channels.includes('instagram') && (
                <FormControl>
                  <FormLabel>Instagramメッセージ</FormLabel>
                  <Textarea
                    value={formData.messageContent.instagram}
                    onChange={(e) => setFormData({
                      ...formData,
                      messageContent: { ...formData.messageContent, instagram: e.target.value }
                    })}
                    placeholder="Instagramメッセージを入力..."
                  />
                </FormControl>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsCreateModalOpen(false)}>
              キャンセル
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleCreateJob}
              isLoading={createJobMutation.isLoading}
              isDisabled={!formData.name || formData.channels.length === 0}
            >
              作成
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default BulkMessageManager;