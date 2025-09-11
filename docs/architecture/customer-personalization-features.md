# 顧客個別ページ機能設計書

## 1. 顧客個別ページ概要

### 1.1 設計コンセプト
美容室顧客一人ひとりに特化したパーソナライズされた体験を提供し、リピート率向上と顧客満足度向上を実現する。

### 1.2 主要機能
- **個人ダッシュボード**: 次回予約、ポイント残高、お知らせの一元表示
- **予約履歴・次回予約**: 過去の履歴と将来の予約管理
- **施術記録・写真**: ビフォーアフター写真と施術詳細
- **ポイント・特典管理**: 忠誠顧客プログラム
- **パーソナライズレコメンド**: AI による個別提案
- **メッセージ・連絡機能**: 美容師との直接コミュニケーション

## 2. ダッシュボード設計

### 2.1 情報アーキテクチャ

```javascript
const DashboardLayout = {
  header: {
    welcome_message: "こんにちは、{customer_name}さん",
    salon_info: "salon_name + location",
    notifications_badge: "未読通知数"
  },
  
  hero_section: {
    next_appointment: {
      display_condition: "予約がある場合",
      content: {
        date_time: "YYYY年MM月DD日 HH:mm",
        service: "カット + カラー",
        stylist: "担当スタイリスト名",
        actions: ["変更", "キャンセル", "詳細"]
      }
    },
    
    no_appointment: {
      display_condition: "予約がない場合", 
      content: {
        last_visit: "前回来店: YYYY年MM月DD日",
        recommendation: "次回来店推奨: YYYY年MM月頃",
        cta: "予約する"
      }
    }
  },
  
  quick_stats: {
    loyalty_points: {
      current_points: "現在のポイント",
      next_reward: "次の特典まで",
      tier_status: "会員ランク"
    },
    visit_history: {
      total_visits: "来店回数",
      member_since: "会員歴",
      favorite_service: "よく利用するサービス"
    }
  },
  
  recent_activities: {
    limit: 5,
    types: ["appointment", "point_earned", "reward_redeemed", "message"]
  }
};
```

### 2.2 ダッシュボードUI設計

```jsx
// React コンポーネント設計例
const CustomerDashboard = () => {
  return (
    <Box>
      {/* ヘッダーセクション */}
      <DashboardHeader 
        customerName={customer.firstName}
        unreadNotifications={notifications.unread.length}
      />
      
      {/* メインカード */}
      <VStack spacing={6} mt={6}>
        {upcomingAppointment ? (
          <NextAppointmentCard appointment={upcomingAppointment} />
        ) : (
          <BookingPromptCard 
            lastVisit={customer.lastVisitDate}
            recommendedDate={getRecommendedNextVisit()}
          />
        )}
        
        {/* クイック統計 */}
        <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4} w="full">
          <StatCard
            title="ポイント"
            value={customer.loyaltyPoints}
            icon={<StarIcon />}
            color="purple.500"
          />
          <StatCard
            title="来店回数"
            value={customer.visitCount}
            icon={<CalendarIcon />}
            color="blue.500"
          />
          <StatCard
            title="会員歴"
            value={getMembershipDuration()}
            icon={<TimeIcon />}
            color="green.500"
          />
        </SimpleGrid>
        
        {/* 最近のアクティビティ */}
        <RecentActivitiesCard activities={recentActivities} />
        
        {/* パーソナライズレコメンド */}
        <RecommendationsCard recommendations={aiRecommendations} />
      </VStack>
    </Box>
  );
};
```

## 3. 予約履歴・次回予約機能

### 3.1 予約履歴データ構造

```javascript
const AppointmentHistory = {
  appointment_id: 'uuid',
  date: '2024-01-15',
  start_time: '14:00',
  end_time: '16:30',
  
  services: [
    {
      name: 'カット',
      duration: 60,
      price: 5000,
      stylist: 'stylist_uuid'
    },
    {
      name: 'カラーリング',
      duration: 90, 
      price: 8000,
      stylist: 'stylist_uuid'
    }
  ],
  
  total_amount: 13000,
  payment_status: 'completed',
  
  stylist: {
    id: 'stylist_uuid',
    name: '田中 美咲',
    photo: 'stylist_photo_url',
    specialties: ['カット', 'カラー']
  },
  
  status: 'completed', // scheduled, completed, cancelled, no_show
  
  // 施術詳細
  treatment_details: {
    before_photos: ['url1', 'url2'],
    after_photos: ['url3', 'url4'],
    products_used: ['シャンプーA', 'カラー剤B'],
    stylist_notes: '次回は6-8週間後がおすすめ',
    customer_rating: 5,
    customer_review: '大変満足でした！'
  },
  
  // ポイント履歴
  points_earned: 130,
  points_used: 0
};
```

### 3.2 予約履歴UI設計

```jsx
const AppointmentHistoryPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('all'); // all, upcoming, completed, cancelled
  
  return (
    <Box>
      <PageHeader title="予約履歴" />
      
      {/* フィルタータブ */}
      <Tabs value={filter} onChange={setFilter}>
        <TabList mb={4}>
          <Tab value="all">すべて</Tab>
          <Tab value="upcoming">今後の予約</Tab>
          <Tab value="completed">完了</Tab>
          <Tab value="cancelled">キャンセル</Tab>
        </TabList>
      </Tabs>
      
      {/* 予約リスト */}
      <VStack spacing={4}>
        {appointments.map(appointment => (
          <AppointmentCard
            key={appointment.id}
            appointment={appointment}
            onViewDetails={() => openAppointmentDetails(appointment)}
            onRebook={() => rebookAppointment(appointment)}
          />
        ))}
      </VStack>
      
      {/* 新規予約ボタン */}
      <FloatingActionButton 
        icon={<AddIcon />}
        onClick={() => router.push('/booking')}
      />
    </Box>
  );
};

const AppointmentCard = ({ appointment, onViewDetails, onRebook }) => {
  const isUpcoming = new Date(appointment.date) > new Date();
  const canModify = isUpcoming && appointment.status === 'scheduled';
  
  return (
    <Box 
      borderWidth="1px" 
      borderRadius="lg" 
      p={4}
      bg={appointment.status === 'completed' ? 'gray.50' : 'white'}
    >
      <HStack justify="space-between" mb={2}>
        <VStack align="start" spacing={1}>
          <Text fontSize="lg" fontWeight="bold">
            {formatDate(appointment.date)}
          </Text>
          <Text color="gray.600">
            {appointment.start_time} - {appointment.end_time}
          </Text>
        </VStack>
        
        <Badge 
          colorScheme={getStatusColor(appointment.status)}
          variant="subtle"
        >
          {getStatusText(appointment.status)}
        </Badge>
      </HStack>
      
      {/* サービス詳細 */}
      <VStack align="start" spacing={2} mb={3}>
        {appointment.services.map((service, index) => (
          <HStack key={index}>
            <Text>{service.name}</Text>
            <Spacer />
            <Text fontWeight="bold">¥{service.price.toLocaleString()}</Text>
          </HStack>
        ))}
        <Divider />
        <HStack w="full">
          <Text fontWeight="bold">合計</Text>
          <Spacer />
          <Text fontWeight="bold" fontSize="lg" color="purple.600">
            ¥{appointment.total_amount.toLocaleString()}
          </Text>
        </HStack>
      </VStack>
      
      {/* スタイリスト情報 */}
      <HStack mb={3}>
        <Avatar size="sm" src={appointment.stylist.photo} />
        <Text>{appointment.stylist.name}</Text>
      </HStack>
      
      {/* アクションボタン */}
      <ButtonGroup size="sm" spacing={2}>
        <Button 
          variant="outline" 
          onClick={onViewDetails}
        >
          詳細
        </Button>
        
        {canModify && (
          <>
            <Button 
              colorScheme="purple" 
              variant="outline"
              onClick={onRebook}
            >
              再予約
            </Button>
            <Button 
              variant="ghost" 
              color="red.500"
              onClick={() => cancelAppointment(appointment.id)}
            >
              キャンセル
            </Button>
          </>
        )}
        
        {appointment.status === 'completed' && !appointment.customer_rating && (
          <Button 
            colorScheme="yellow" 
            variant="outline"
            onClick={() => openReviewModal(appointment)}
          >
            レビュー
          </Button>
        )}
      </ButtonGroup>
    </Box>
  );
};
```

## 4. 施術記録・写真機能

### 4.1 施術記録データ設計

```javascript
const TreatmentRecord = {
  record_id: 'uuid',
  appointment_id: 'uuid',
  customer_id: 'uuid',
  date: '2024-01-15',
  
  // 写真記録
  photos: {
    before: [
      {
        url: 'https://storage.salon.com/before_front.jpg',
        angle: 'front', // front, side, back
        timestamp: '2024-01-15T14:00:00Z',
        metadata: {
          camera_model: 'iPhone 14',
          location: 'salon_mirror_1'
        }
      }
    ],
    
    after: [
      {
        url: 'https://storage.salon.com/after_front.jpg',
        angle: 'front',
        timestamp: '2024-01-15T16:30:00Z',
        metadata: {
          lighting: 'natural',
          filter: 'none'
        }
      }
    ],
    
    process: [ // 施術過程の写真（オプション）
      {
        url: 'https://storage.salon.com/process_1.jpg',
        step: 'カラー塗布後',
        timestamp: '2024-01-15T15:00:00Z'
      }
    ]
  },
  
  // 施術詳細
  treatment_details: {
    services: [
      {
        name: 'カット',
        techniques: ['レイヤーカット', '毛量調整'],
        length_before: 'shoulder_length',
        length_after: 'bob_length',
        notes: '顔型に合わせた小顔効果のあるボブスタイル'
      },
      {
        name: 'カラーリング',
        color_before: '#4a4a4a',
        color_after: '#8b4513', 
        formula: 'ナチュラルブラウン 7レベル',
        processing_time: 45,
        notes: '肌色に合わせた温かみのあるブラウン'
      }
    ],
    
    products_used: [
      {
        category: 'shampoo',
        name: 'オーガニックシャンプー',
        brand: 'サロンブランドA'
      },
      {
        category: 'color',
        name: 'ナチュラルブラウン',
        brand: 'プロフェッショナルカラーB',
        formula: '7NB + 6N (1:1)'
      }
    ]
  },
  
  // スタイリングアドバイス
  styling_advice: {
    daily_care: [
      '洗髪は2日に1回程度',
      'ドライヤーは根元から乾かす',
      '毛先には洗い流さないトリートメントを'
    ],
    
    styling_tips: [
      '32mmのコテで軽く内巻きに',
      'ワックスは毛先中心に少量つける'
    ],
    
    maintenance: {
      next_visit_recommended: '2024-03-15',
      recommended_services: ['カット', 'トリートメント'],
      notes: '根元が伸びてきたら来店を推奨'
    }
  },
  
  // 顧客フィードバック
  customer_feedback: {
    satisfaction_rating: 5,
    review_text: '思った通りの仕上がりで大変満足です！',
    would_recommend: true,
    favorite_aspect: 'color'
  },
  
  // プライバシー設定
  privacy_settings: {
    photos_visible_to_customer: true,
    photos_shareable: false, // SNS等での共有許可
    record_visible_to_customer: true
  }
};
```

### 4.2 写真ビューア機能

```jsx
const TreatmentPhotosViewer = ({ treatmentRecord }) => {
  const [selectedPhotoSet, setSelectedPhotoSet] = useState('after'); // before, after, process
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  const photoSets = {
    before: treatmentRecord.photos.before,
    after: treatmentRecord.photos.after,
    process: treatmentRecord.photos.process || []
  };
  
  return (
    <Box>
      <Text fontSize="xl" fontWeight="bold" mb={4}>
        施術記録 - {formatDate(treatmentRecord.date)}
      </Text>
      
      {/* 写真カテゴリー選択 */}
      <ButtonGroup mb={4} size="sm" variant="outline">
        <Button
          isActive={selectedPhotoSet === 'before'}
          onClick={() => setSelectedPhotoSet('before')}
        >
          ビフォー ({photoSets.before.length})
        </Button>
        <Button
          isActive={selectedPhotoSet === 'after'}
          onClick={() => setSelectedPhotoSet('after')}
        >
          アフター ({photoSets.after.length})
        </Button>
        {photoSets.process.length > 0 && (
          <Button
            isActive={selectedPhotoSet === 'process'}
            onClick={() => setSelectedPhotoSet('process')}
          >
            過程 ({photoSets.process.length})
          </Button>
        )}
      </ButtonGroup>
      
      {/* 写真グリッド */}
      <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4} mb={6}>
        {photoSets[selectedPhotoSet].map((photo, index) => (
          <Box
            key={index}
            position="relative"
            cursor="pointer"
            onClick={() => {
              setSelectedPhoto(index);
              setIsLightboxOpen(true);
            }}
            _hover={{ transform: 'scale(1.05)' }}
            transition="transform 0.2s"
          >
            <Image
              src={photo.url}
              alt={`${selectedPhotoSet} ${photo.angle || index + 1}`}
              borderRadius="lg"
              objectFit="cover"
              aspectRatio="1"
            />
            
            {/* 写真ラベル */}
            <Badge
              position="absolute"
              top={2}
              left={2}
              bg="blackAlpha.700"
              color="white"
            >
              {photo.angle || photo.step || `${index + 1}`}
            </Badge>
            
            {/* 拡大アイコン */}
            <IconButton
              position="absolute"
              bottom={2}
              right={2}
              size="sm"
              icon={<ViewIcon />}
              bg="blackAlpha.700"
              color="white"
              _hover={{ bg: 'blackAlpha.800' }}
            />
          </Box>
        ))}
      </SimpleGrid>
      
      {/* ビフォー・アフター比較 */}
      {photoSets.before.length > 0 && photoSets.after.length > 0 && (
        <BeforeAfterComparison
          beforePhoto={photoSets.before[0]}
          afterPhoto={photoSets.after[0]}
        />
      )}
      
      {/* 施術詳細情報 */}
      <TreatmentDetailsSection details={treatmentRecord.treatment_details} />
      
      {/* スタイリングアドバイス */}
      <StylingAdviceSection advice={treatmentRecord.styling_advice} />
      
      {/* ライトボックス */}
      <PhotoLightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        photos={photoSets[selectedPhotoSet]}
        initialIndex={selectedPhoto}
      />
    </Box>
  );
};

const BeforeAfterComparison = ({ beforePhoto, afterPhoto }) => {
  return (
    <Box mb={6} p={4} bg="gray.50" borderRadius="lg">
      <Text fontSize="lg" fontWeight="bold" mb={4} textAlign="center">
        ビフォー・アフター比較
      </Text>
      
      <SimpleGrid columns={2} spacing={4}>
        <Box textAlign="center">
          <Text mb={2} fontWeight="bold">Before</Text>
          <Image
            src={beforePhoto.url}
            alt="Before"
            borderRadius="lg"
            objectFit="cover"
            aspectRatio="1"
          />
        </Box>
        
        <Box textAlign="center">
          <Text mb={2} fontWeight="bold">After</Text>
          <Image
            src={afterPhoto.url}
            alt="After"
            borderRadius="lg"
            objectFit="cover"
            aspectRatio="1"
          />
        </Box>
      </SimpleGrid>
      
      {/* 共有ボタン */}
      <HStack justify="center" mt={4}>
        <Button
          size="sm"
          leftIcon={<ShareIcon />}
          onClick={() => shareBeforeAfter(beforePhoto, afterPhoto)}
        >
          SNSでシェア
        </Button>
        <Button
          size="sm"
          variant="outline"
          leftIcon={<DownloadIcon />}
          onClick={() => downloadComparison(beforePhoto, afterPhoto)}
        >
          画像保存
        </Button>
      </HStack>
    </Box>
  );
};
```

## 5. ポイント・特典管理機能

### 5.1 ロイヤルティプログラム設計

```javascript
const LoyaltyProgram = {
  // ポイント獲得ルール
  earning_rules: {
    visit: {
      points: 100,
      description: '来店ごとに100ポイント'
    },
    spending: {
      rate: 0.01, // 1円につき0.01ポイント (1%)
      description: 'お支払い金額の1%をポイント還元'
    },
    review: {
      points: 50,
      description: 'レビュー投稿で50ポイント',
      conditions: ['star_rating >= 4', 'review_text.length >= 20']
    },
    referral: {
      points: 500,
      description: 'お友達紹介で500ポイント',
      conditions: ['referred_friend_first_visit']
    },
    birthday: {
      points: 1000,
      description: '誕生月に1000ポイント'
    },
    sns_share: {
      points: 30,
      description: 'SNS投稿で30ポイント',
      daily_limit: 100
    }
  },
  
  // 会員ランク制度
  tier_system: {
    regular: {
      required_points: 0,
      point_multiplier: 1.0,
      discount_rate: 0,
      benefits: [
        '誕生月ポイント2倍',
        '会員限定キャンペーン参加'
      ]
    },
    
    silver: {
      required_points: 5000,
      point_multiplier: 1.2,
      discount_rate: 0.05,
      benefits: [
        '全サービス5%割引',
        '優先予約権',
        '誕生月ポイント3倍',
        '専用カスタマーサポート'
      ]
    },
    
    gold: {
      required_points: 15000,
      point_multiplier: 1.5,
      discount_rate: 0.10,
      benefits: [
        '全サービス10%割引',
        '最優先予約権',
        '無料ドリンクサービス',
        '誕生月ポイント5倍',
        '無料ヘッドスパ（月1回）'
      ]
    },
    
    platinum: {
      required_points: 50000,
      point_multiplier: 2.0,
      discount_rate: 0.15,
      benefits: [
        '全サービス15%割引',
        'VIP専用時間枠',
        '無料トリートメント（月1回）',
        '誕生月ポイント10倍',
        '専属スタイリスト指名無料'
      ]
    }
  },
  
  // 特典・リワード
  rewards: [
    {
      id: 'discount_500',
      name: '500円割引クーポン',
      points_required: 1000,
      type: 'discount',
      value: 500,
      conditions: ['minimum_purchase >= 3000'],
      expiry_days: 30
    },
    {
      id: 'free_shampoo',
      name: 'シャンプー・ブロー無料',
      points_required: 800,
      type: 'service',
      conditions: ['with_other_service'],
      expiry_days: 60
    },
    {
      id: 'free_treatment',
      name: 'トリートメント無料',
      points_required: 2000,
      type: 'service',
      conditions: ['silver_tier_above'],
      expiry_days: 90
    },
    {
      id: 'product_discount',
      name: 'ホームケア商品20%OFF',
      points_required: 1500,
      type: 'product_discount',
      value: 0.20,
      category: 'homecare',
      expiry_days: 45
    }
  ]
};
```

### 5.2 ポイント管理UI設計

```jsx
const LoyaltyDashboard = ({ customer }) => {
  const currentTier = getCurrentTier(customer.total_points);
  const nextTier = getNextTier(currentTier);
  const pointsToNextTier = nextTier ? nextTier.required_points - customer.total_points : 0;
  
  return (
    <Box>
      <PageHeader title="ポイント・特典" />
      
      {/* 現在のステータス */}
      <VStack spacing={6} mb={8}>
        <Box
          w="full"
          p={6}
          bg={getTierColor(currentTier.name)}
          borderRadius="xl"
          color="white"
          textAlign="center"
        >
          <VStack spacing={3}>
            <HStack>
              <Icon as={getTierIcon(currentTier.name)} boxSize={8} />
              <Text fontSize="2xl" fontWeight="bold">
                {getTierDisplayName(currentTier.name)}会員
              </Text>
            </HStack>
            
            <Text fontSize="3xl" fontWeight="bold">
              {customer.current_points.toLocaleString()} P
            </Text>
            <Text opacity={0.9}>
              利用可能ポイント
            </Text>
            
            {nextTier && (
              <Box mt={4} w="full">
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="sm">
                    {getTierDisplayName(nextTier.name)}まで
                  </Text>
                  <Text fontSize="sm">
                    {pointsToNextTier.toLocaleString()}P
                  </Text>
                </HStack>
                <Progress
                  value={(customer.total_points / nextTier.required_points) * 100}
                  bg="whiteAlpha.300"
                  borderRadius="full"
                />
              </Box>
            )}
          </VStack>
        </Box>
        
        {/* ティア特典一覧 */}
        <Box w="full" p={4} bg="gray.50" borderRadius="lg">
          <Text fontWeight="bold" mb={3}>現在の特典</Text>
          <VStack align="start" spacing={2}>
            {currentTier.benefits.map((benefit, index) => (
              <HStack key={index}>
                <CheckIcon color="green.500" boxSize={4} />
                <Text fontSize="sm">{benefit}</Text>
              </HStack>
            ))}
          </VStack>
        </Box>
      </VStack>
      
      {/* 特典交換 */}
      <RewardsSection 
        availablePoints={customer.current_points}
        customerTier={currentTier}
      />
      
      {/* ポイント履歴 */}
      <PointsHistorySection customerId={customer.id} />
    </Box>
  );
};

const RewardsSection = ({ availablePoints, customerTier }) => {
  const [selectedReward, setSelectedReward] = useState(null);
  const availableRewards = getAvailableRewards(availablePoints, customerTier);
  
  return (
    <Box mb={8}>
      <Text fontSize="xl" fontWeight="bold" mb={4}>
        特典交換
      </Text>
      
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {availableRewards.map(reward => (
          <RewardCard
            key={reward.id}
            reward={reward}
            canRedeem={availablePoints >= reward.points_required}
            onSelect={() => setSelectedReward(reward)}
          />
        ))}
      </SimpleGrid>
      
      {/* 交換確認モーダル */}
      <RewardRedemptionModal
        isOpen={!!selectedReward}
        reward={selectedReward}
        onClose={() => setSelectedReward(null)}
        onConfirm={(reward) => redeemReward(reward)}
      />
    </Box>
  );
};

const RewardCard = ({ reward, canRedeem, onSelect }) => {
  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      p={4}
      bg={canRedeem ? 'white' : 'gray.100'}
      opacity={canRedeem ? 1 : 0.6}
      cursor={canRedeem ? 'pointer' : 'not-allowed'}
      onClick={() => canRedeem && onSelect()}
      _hover={canRedeem ? { shadow: 'md' } : {}}
    >
      <VStack align="start" spacing={3}>
        <HStack w="full" justify="space-between">
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold">{reward.name}</Text>
            <Text fontSize="sm" color="gray.600">
              {reward.description}
            </Text>
          </VStack>
          <Icon as={getRewardIcon(reward.type)} boxSize={6} color="purple.500" />
        </HStack>
        
        <HStack w="full" justify="space-between" align="center">
          <HStack>
            <Icon as={StarIcon} color="yellow.400" boxSize={4} />
            <Text fontWeight="bold" color="purple.600">
              {reward.points_required.toLocaleString()} P
            </Text>
          </HStack>
          
          {canRedeem ? (
            <Button size="sm" colorScheme="purple">
              交換する
            </Button>
          ) : (
            <Text fontSize="xs" color="gray.500">
              ポイント不足
            </Text>
          )}
        </HStack>
        
        {reward.expiry_days && (
          <Text fontSize="xs" color="orange.500">
            有効期限: {reward.expiry_days}日間
          </Text>
        )}
      </VStack>
    </Box>
  );
};
```

## 6. メッセージ・連絡機能

### 6.1 メッセージング機能設計

```javascript
const MessagingSystem = {
  // メッセージタイプ
  message_types: {
    customer_to_salon: {
      allowed: true,
      moderation: false,
      auto_response: true
    },
    salon_to_customer: {
      allowed: true,
      templates: true,
      broadcast: true
    },
    appointment_related: {
      automatic: true,
      templates: ['confirmation', 'reminder', 'followup']
    },
    promotional: {
      opt_in_required: true,
      frequency_limit: '2_per_week'
    }
  },
  
  // 通信チャンネル
  channels: {
    in_app: {
      priority: 1,
      real_time: true,
      push_notification: true
    },
    sms: {
      priority: 2,
      fallback: true,
      cost_per_message: 10
    },
    email: {
      priority: 3,
      batch_sending: true,
      rich_content: true
    },
    line: {
      priority: 1,
      rich_content: true,
      opt_in_required: true
    }
  },
  
  // 自動応答システム
  auto_responses: {
    business_hours: {
      trigger: 'message_received_outside_hours',
      template: '営業時間外のお問い合わせありがとうございます。営業時間内にお返事いたします。'
    },
    appointment_inquiry: {
      trigger: 'keywords: ["予約", "空き", "時間"]',
      action: 'redirect_to_booking_page'
    },
    general_inquiry: {
      trigger: 'default',
      template: 'お問い合わせありがとうございます。担当者より順次お返事いたします。'
    }
  }
};
```

### 6.2 チャット画面設計

```jsx
const CustomerMessaging = ({ customerId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // WebSocket接続でリアルタイム通信
  useEffect(() => {
    const socket = io('/customer-chat', {
      auth: { customerId, token: getAuthToken() }
    });
    
    socket.on('message_received', (message) => {
      setMessages(prev => [...prev, message]);
      if (!message.read) setUnreadCount(prev => prev + 1);
    });
    
    socket.on('typing', (data) => {
      setIsTyping(data.isTyping);
    });
    
    return () => socket.disconnect();
  }, [customerId]);
  
  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    const message = {
      content: newMessage,
      type: 'text',
      sender: 'customer',
      timestamp: new Date(),
      customerId
    };
    
    await sendCustomerMessage(message);
    setNewMessage('');
  };
  
  return (
    <Box h="100vh" display="flex" flexDirection="column">
      {/* ヘッダー */}
      <Box
        p={4}
        borderBottomWidth="1px"
        bg="purple.500"
        color="white"
      >
        <HStack>
          <Avatar size="sm" src="/salon-logo.png" />
          <VStack align="start" spacing={0}>
            <Text fontWeight="bold">サロン ルミエール</Text>
            <Text fontSize="sm" opacity={0.8}>
              {isTyping ? 'スタッフが入力中...' : 'オンライン'}
            </Text>
          </VStack>
          <Spacer />
          <IconButton
            icon={<PhoneIcon />}
            variant="ghost"
            color="white"
            onClick={() => callSalon()}
          />
        </HStack>
      </Box>
      
      {/* メッセージ一覧 */}
      <Box flex={1} overflowY="auto" p={4}>
        <VStack spacing={4} align="stretch">
          {messages.map(message => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender === 'customer'}
            />
          ))}
          
          {isTyping && (
            <HStack justify="start">
              <Avatar size="sm" src="/staff-avatar.png" />
              <Box
                bg="gray.100"
                borderRadius="lg"
                p={3}
                maxW="60%"
              >
                <TypingIndicator />
              </Box>
            </HStack>
          )}
        </VStack>
      </Box>
      
      {/* 入力エリア */}
      <Box p={4} borderTopWidth="1px" bg="white">
        <HStack spacing={2}>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="メッセージを入力..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <IconButton
            icon={<AttachmentIcon />}
            variant="ghost"
            onClick={() => attachFile()}
          />
          <IconButton
            icon={<SendIcon />}
            colorScheme="purple"
            isDisabled={!newMessage.trim()}
            onClick={sendMessage}
          />
        </HStack>
      </Box>
      
      {/* クイック返信ボタン */}
      <QuickReplyButtons onSelect={(reply) => setNewMessage(reply)} />
    </Box>
  );
};

const MessageBubble = ({ message, isOwn }) => {
  const bgColor = isOwn ? 'purple.500' : 'gray.100';
  const textColor = isOwn ? 'white' : 'black';
  const alignment = isOwn ? 'flex-end' : 'flex-start';
  
  return (
    <HStack justify={alignment} align="flex-end" spacing={2}>
      {!isOwn && <Avatar size="sm" src="/staff-avatar.png" />}
      
      <Box
        bg={bgColor}
        color={textColor}
        borderRadius="lg"
        p={3}
        maxW="70%"
      >
        {message.type === 'text' && (
          <Text>{message.content}</Text>
        )}
        
        {message.type === 'image' && (
          <Image
            src={message.imageUrl}
            alt="Shared image"
            borderRadius="md"
            maxW="200px"
          />
        )}
        
        {message.type === 'appointment' && (
          <AppointmentCard appointment={message.appointmentData} compact />
        )}
        
        <Text
          fontSize="xs"
          opacity={0.7}
          mt={1}
          textAlign={isOwn ? 'right' : 'left'}
        >
          {formatTime(message.timestamp)}
        </Text>
      </Box>
      
      {isOwn && <Avatar size="sm" src="/customer-avatar.png" />}
    </HStack>
  );
};

const QuickReplyButtons = ({ onSelect }) => {
  const quickReplies = [
    '予約をお願いします',
    'ありがとうございます',
    '了解しました',
    '時間の変更はできますか？'
  ];
  
  return (
    <Box p={2} bg="gray.50">
      <Text fontSize="xs" color="gray.600" mb={2}>
        クイック返信
      </Text>
      <HStack spacing={2} overflowX="auto">
        {quickReplies.map((reply, index) => (
          <Button
            key={index}
            size="sm"
            variant="outline"
            flexShrink={0}
            onClick={() => onSelect(reply)}
          >
            {reply}
          </Button>
        ))}
      </HStack>
    </Box>
  );
};
```

## 7. パーソナライゼーション・AI機能

### 7.1 レコメンドエンジン設計

```javascript
const PersonalizationEngine = {
  // データ収集
  data_collection: {
    explicit_feedback: [
      'service_ratings',
      'stylist_preferences', 
      'style_preferences',
      'product_ratings'
    ],
    
    implicit_behavior: [
      'booking_patterns',
      'service_frequency',
      'spending_patterns',
      'session_duration',
      'photo_engagement'
    ],
    
    contextual_data: [
      'season',
      'weather',
      'events',
      'trends',
      'age_group'
    ]
  },
  
  // 推薦アルゴリズム
  recommendation_types: {
    service_recommendations: {
      algorithm: 'collaborative_filtering + content_based',
      factors: ['past_services', 'similar_customers', 'seasonal_trends'],
      confidence_threshold: 0.7
    },
    
    stylist_matching: {
      algorithm: 'compatibility_score',
      factors: ['style_preferences', 'personality_match', 'availability'],
      learning_rate: 0.1
    },
    
    timing_optimization: {
      algorithm: 'time_series_analysis',
      factors: ['past_booking_patterns', 'lifecycle_events', 'weather'],
      prediction_horizon: '3_months'
    },
    
    product_suggestions: {
      algorithm: 'market_basket_analysis',
      factors: ['hair_type', 'service_history', 'purchase_history'],
      cross_sell_boost: 1.2
    }
  }
};
```

### 7.2 パーソナライゼーション機能実装

```jsx
const PersonalizedRecommendations = ({ customer }) => {
  const [recommendations, setRecommendations] = useState({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchPersonalizedRecommendations(customer.id)
      .then(setRecommendations)
      .finally(() => setLoading(false));
  }, [customer.id]);
  
  if (loading) return <RecommendationsLoading />;
  
  return (
    <VStack spacing={6}>
      {/* サービス提案 */}
      <RecommendationSection
        title="あなたにおすすめのサービス"
        items={recommendations.services}
        renderItem={(service) => (
          <ServiceRecommendationCard
            key={service.id}
            service={service}
            confidence={service.confidence_score}
            reason={service.recommendation_reason}
            onBook={() => bookService(service)}
          />
        )}
      />
      
      {/* スタイリスト提案 */}
      <RecommendationSection
        title="相性の良いスタイリスト"
        items={recommendations.stylists}
        renderItem={(stylist) => (
          <StylistRecommendationCard
            key={stylist.id}
            stylist={stylist}
            compatibility={stylist.compatibility_score}
            onSelect={() => selectStylist(stylist)}
          />
        )}
      />
      
      {/* 次回来店提案 */}
      <NextVisitRecommendation
        recommendation={recommendations.next_visit}
        onSchedule={(date) => scheduleAppointment(date)}
      />
      
      {/* ホームケア商品提案 */}
      <ProductRecommendations
        products={recommendations.products}
        onViewProduct={(product) => viewProduct(product)}
      />
    </VStack>
  );
};

const ServiceRecommendationCard = ({ service, confidence, reason, onBook }) => {
  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      p={4}
      bg="white"
      shadow="sm"
    >
      <HStack spacing={4}>
        <Image
          src={service.image}
          alt={service.name}
          boxSize="80px"
          objectFit="cover"
          borderRadius="md"
        />
        
        <VStack align="start" flex={1} spacing={2}>
          <HStack w="full" justify="space-between">
            <Text fontWeight="bold" fontSize="lg">
              {service.name}
            </Text>
            <Badge colorScheme="purple" variant="subtle">
              {Math.round(confidence * 100)}% マッチ
            </Badge>
          </HStack>
          
          <Text color="gray.600" fontSize="sm">
            {service.description}
          </Text>
          
          <Text fontSize="xs" color="purple.600" fontStyle="italic">
            💡 {reason}
          </Text>
          
          <HStack w="full" justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <Text fontSize="sm" color="gray.500">
                所要時間: {service.duration}分
              </Text>
              <Text fontWeight="bold" color="purple.600">
                ¥{service.price.toLocaleString()}
              </Text>
            </VStack>
            
            <Button
              size="sm"
              colorScheme="purple"
              onClick={onBook}
            >
              予約する
            </Button>
          </HStack>
        </VStack>
      </HStack>
    </Box>
  );
};

const NextVisitRecommendation = ({ recommendation, onSchedule }) => {
  if (!recommendation) return null;
  
  return (
    <Box
      w="full"
      p={6}
      bg="gradient-to-r from-purple.50 to-pink.50"
      borderRadius="xl"
      border="1px"
      borderColor="purple.200"
    >
      <VStack spacing={4}>
        <HStack>
          <Icon as={CalendarIcon} color="purple.500" boxSize={6} />
          <Text fontSize="xl" fontWeight="bold">
            次回来店のおすすめ
          </Text>
        </HStack>
        
        <Text textAlign="center" color="gray.700">
          前回の{recommendation.last_service}から{recommendation.days_since}日経過しています。
          <br />
          {recommendation.recommended_date}頃の来店がおすすめです。
        </Text>
        
        <HStack spacing={4}>
          <VStack>
            <Text fontSize="sm" color="gray.600">推奨サービス</Text>
            <Badge colorScheme="purple">{recommendation.suggested_service}</Badge>
          </VStack>
          
          <VStack>
            <Text fontSize="sm" color="gray.600">予想価格</Text>
            <Text fontWeight="bold">¥{recommendation.estimated_cost.toLocaleString()}</Text>
          </VStack>
        </HStack>
        
        <Button
          colorScheme="purple"
          size="lg"
          onClick={() => onSchedule(recommendation.recommended_date)}
        >
          この日程で予約する
        </Button>
      </VStack>
    </Box>
  );
};
```

この顧客個別ページ機能設計により、美容室顧客一人ひとりに合わせたパーソナライズされた体験を提供し、顧客満足度とロイヤルティの向上を実現できます。