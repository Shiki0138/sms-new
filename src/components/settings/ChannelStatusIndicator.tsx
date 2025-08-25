import React from 'react';
import {
  Badge,
  HStack,
  Text,
  Tooltip,
  Icon,
  Box,
  VStack
} from '@chakra-ui/react';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';

interface ChannelConfig {
  channel: string;
  isActive: boolean;
  isVerified: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'testing';
  lastConnectionTest?: string;
  connectionError?: string;
  testAttempts: number;
  maxTestAttempts: number;
}

interface ChannelStatusIndicatorProps {
  config: ChannelConfig;
  showDetails?: boolean;
}

const statusConfig = {
  connected: {
    color: 'green',
    icon: CheckCircle,
    label: '接続済み',
    description: 'チャネルは正常に動作しています'
  },
  disconnected: {
    color: 'gray',
    icon: WifiOff,
    label: '未接続',
    description: 'チャネルが設定されていません'
  },
  error: {
    color: 'red',
    icon: XCircle,
    label: 'エラー',
    description: '接続エラーが発生しています'
  },
  testing: {
    color: 'blue',
    icon: Clock,
    label: 'テスト中',
    description: '接続テストを実行中です'
  }
};

const ChannelStatusIndicator: React.FC<ChannelStatusIndicatorProps> = ({
  config,
  showDetails = false
}) => {
  const status = statusConfig[config.connectionStatus];
  const IconComponent = status.icon;
  
  const getStatusText = () => {
    if (!config.isActive) {
      return '無効';
    }
    return status.label;
  };

  const getStatusColor = () => {
    if (!config.isActive) {
      return 'gray';
    }
    return status.color;
  };

  const getTooltipContent = () => {
    const parts = [];
    
    parts.push(status.description);
    
    if (config.lastConnectionTest) {
      const testDate = new Date(config.lastConnectionTest);
      parts.push(`最終テスト: ${testDate.toLocaleString('ja-JP')}`);
    }
    
    if (config.connectionError) {
      parts.push(`エラー: ${config.connectionError}`);
    }
    
    if (config.testAttempts > 0) {
      parts.push(`テスト回数: ${config.testAttempts}/${config.maxTestAttempts}`);
    }
    
    return parts.join('\n');
  };

  const isNearMaxAttempts = config.testAttempts >= config.maxTestAttempts * 0.8;

  if (showDetails) {
    return (
      <VStack align="stretch" spacing={2}>
        <HStack spacing={2}>
          <Icon
            as={IconComponent}
            color={`${getStatusColor()}.500`}
            boxSize={4}
          />
          <Text fontSize="sm" fontWeight="medium">
            {getStatusText()}
          </Text>
          {!config.isActive && (
            <Badge colorScheme="gray" size="sm">
              無効
            </Badge>
          )}
          {config.isVerified && config.isActive && (
            <Badge colorScheme="green" size="sm">
              検証済み
            </Badge>
          )}
        </HStack>
        
        {config.connectionError && (
          <Box
            bg="red.50"
            border="1px"
            borderColor="red.200"
            borderRadius="md"
            p={2}
          >
            <Text fontSize="xs" color="red.600">
              {config.connectionError}
            </Text>
          </Box>
        )}
        
        {config.lastConnectionTest && (
          <Text fontSize="xs" color="gray.500">
            最終テスト: {new Date(config.lastConnectionTest).toLocaleString('ja-JP')}
          </Text>
        )}
        
        {isNearMaxAttempts && (
          <Box
            bg="orange.50"
            border="1px"
            borderColor="orange.200"
            borderRadius="md"
            p={2}
          >
            <Text fontSize="xs" color="orange.600">
              ⚠️ テスト回数が上限に近づいています ({config.testAttempts}/{config.maxTestAttempts})
            </Text>
          </Box>
        )}
      </VStack>
    );
  }

  return (
    <Tooltip
      label={getTooltipContent()}
      placement="top"
      hasArrow
      whiteSpace="pre-line"
    >
      <HStack spacing={2} cursor="help">
        <Icon
          as={IconComponent}
          color={`${getStatusColor()}.500`}
          boxSize={4}
        />
        <Badge
          colorScheme={getStatusColor()}
          size="sm"
          variant={config.isActive ? "solid" : "outline"}
        >
          {getStatusText()}
        </Badge>
        {isNearMaxAttempts && (
          <Icon
            as={AlertCircle}
            color="orange.500"
            boxSize={3}
          />
        )}
      </HStack>
    </Tooltip>
  );
};

export default ChannelStatusIndicator;