// LINE API 型定義（型安全性向上）

export interface LineMessage {
  type: 'text' | 'sticker' | 'image' | 'video' | 'audio' | 'location' | 'template' | 'flex';
  text?: string;
  stickerId?: string;
  stickerPackageId?: string;
  originalContentUrl?: string;
  previewImageUrl?: string;
  duration?: number;
  title?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  template?: LineTemplate;
  contents?: LineFlexContainer;
}

export interface LineTemplate {
  type: 'buttons' | 'confirm' | 'carousel' | 'image_carousel';
  text?: string;
  thumbnailImageUrl?: string;
  imageAspectRatio?: 'rectangle' | 'square';
  imageSize?: 'cover' | 'contain';
  imageBackgroundColor?: string;
  title?: string;
  actions?: LineAction[];
  columns?: LineTemplateColumn[];
}

export interface LineAction {
  type: 'postback' | 'message' | 'uri' | 'datetimepicker';
  label?: string;
  data?: string;
  text?: string;
  uri?: string;
  mode?: 'date' | 'time' | 'datetime';
  initial?: string;
  max?: string;
  min?: string;
}

export interface LineTemplateColumn {
  thumbnailImageUrl?: string;
  imageBackgroundColor?: string;
  title?: string;
  text?: string;
  actions: LineAction[];
}

export interface LineFlexContainer {
  type: 'bubble' | 'carousel';
  header?: LineFlexComponent;
  hero?: LineFlexComponent;
  body?: LineFlexComponent;
  footer?: LineFlexComponent;
  contents?: LineFlexContainer[];
}

export interface LineFlexComponent {
  type: 'box' | 'button' | 'filler' | 'icon' | 'image' | 'separator' | 'spacer' | 'text';
  layout?: 'baseline' | 'vertical' | 'horizontal';
  contents?: LineFlexComponent[];
  flex?: number;
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  margin?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  paddingAll?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingStart?: string;
  paddingEnd?: string;
  position?: 'relative' | 'absolute';
  offsetTop?: string;
  offsetBottom?: string;
  offsetStart?: string;
  offsetEnd?: string;
  width?: string;
  height?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: string;
  cornerRadius?: string;
  text?: string;
  color?: string;
  align?: 'start' | 'end' | 'center';
  gravity?: 'top' | 'bottom' | 'center';
  wrap?: boolean;
  weight?: 'ultralight' | 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'heavy';
  size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | '3xl' | '4xl' | '5xl';
  url?: string;
  action?: LineAction;
}

export interface LineProfile {
  displayName: string;
  userId: string;
  language?: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export interface LineWebhookEvent {
  type: 'message' | 'follow' | 'unfollow' | 'join' | 'leave' | 'memberJoined' | 'memberLeft' | 'postback' | 'videoPlayComplete' | 'beacon' | 'accountLink' | 'things';
  mode: 'active' | 'standby';
  timestamp: number;
  source: LineEventSource;
  webhookEventId: string;
  deliveryContext: {
    isRedelivery: boolean;
  };
  message?: LineEventMessage;
  postback?: LinePostback;
  joined?: LineEventMember;
  left?: LineEventMember;
}

export interface LineEventSource {
  type: 'user' | 'group' | 'room';
  userId?: string;
  groupId?: string;
  roomId?: string;
}

export interface LineEventMessage {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'sticker';
  quoteToken?: string;
  text?: string;
  fileName?: string;
  fileSize?: number;
  title?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  packageId?: string;
  stickerId?: string;
  stickerResourceType?: 'STATIC' | 'ANIMATION' | 'SOUND' | 'ANIMATION_SOUND' | 'POPUP' | 'POPUP_SOUND' | 'CUSTOM' | 'MESSAGE';
  keywords?: string[];
}

export interface LinePostback {
  data: string;
  params?: {
    date?: string;
    time?: string;
    datetime?: string;
  };
}

export interface LineEventMember {
  members: Array<{
    type: 'user';
    userId: string;
  }>;
}

// API レスポンス型
export interface LineApiResponse<T = any> {
  data?: T;
  error?: {
    message: string;
    details?: any[];
  };
}

// LINE Bot 設定
export interface LineBotConfig {
  channelAccessToken: string;
  channelSecret: string;
  baseUrl?: string;
}