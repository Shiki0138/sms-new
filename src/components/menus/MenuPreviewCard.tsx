import React from 'react';
import { Clock, Users, Star, Tag, TrendingUp, Calendar } from 'lucide-react';
import { TreatmentMenu } from '../../types/treatment';

interface MenuPreviewCardProps {
  menu: TreatmentMenu;
  variant?: 'compact' | 'detailed';
  showAnalytics?: boolean;
}

const MenuPreviewCard: React.FC<MenuPreviewCardProps> = ({ 
  menu, 
  variant = 'compact',
  showAnalytics = false 
}) => {
  const hasSpecialPrice = menu.member_price || menu.peak_price || menu.off_peak_price;
  const discountPercentage = menu.member_price 
    ? Math.round((1 - menu.member_price / menu.price) * 100)
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Image Section */}
      {menu.image_url && variant === 'detailed' && (
        <div className="relative h-48 bg-gray-100">
          <img
            src={menu.image_url}
            alt={menu.name}
            className="w-full h-full object-cover"
          />
          {menu.is_featured && (
            <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
              <Star className="h-3 w-3 mr-1 fill-current" />
              おすすめ
            </div>
          )}
          {hasSpecialPrice && (
            <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              特別価格あり
            </div>
          )}
        </div>
      )}

      {/* Content Section */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-medium text-gray-900">{menu.name}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{menu.category}</p>
          </div>
          <div className="text-right">
            {hasSpecialPrice && menu.member_price && (
              <p className="text-xs text-gray-500 line-through">
                ¥{menu.price.toLocaleString()}
              </p>
            )}
            <p className="text-lg font-bold text-gray-900">
              ¥{(menu.member_price || menu.price).toLocaleString()}
            </p>
            {discountPercentage > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {discountPercentage}% OFF
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {menu.description && variant === 'detailed' && (
          <p className="text-sm text-gray-600 mb-3">{menu.description}</p>
        )}

        {/* Details */}
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            {menu.duration_minutes}分
          </span>
          {menu.is_online_bookable && (
            <span className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              Web予約可
            </span>
          )}
          {menu.popularity_score && menu.popularity_score > 80 && (
            <span className="flex items-center text-yellow-500">
              <Star className="h-4 w-4 mr-1 fill-current" />
              人気
            </span>
          )}
        </div>

        {/* Tags */}
        {menu.tags && menu.tags.length > 0 && variant === 'detailed' && (
          <div className="mt-3 flex flex-wrap gap-1">
            {menu.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Analytics */}
        {showAnalytics && menu.booking_count && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">予約数</span>
              <span className="flex items-center text-gray-900">
                <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
                {menu.booking_count}回
              </span>
            </div>
          </div>
        )}

        {/* Price Variations */}
        {variant === 'detailed' && hasSpecialPrice && (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
            {menu.member_price && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  <Users className="h-4 w-4 inline mr-1" />
                  メンバー価格
                </span>
                <span className="font-medium">¥{menu.member_price.toLocaleString()}</span>
              </div>
            )}
            {menu.peak_price && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">ピーク時間</span>
                <span className="font-medium">¥{menu.peak_price.toLocaleString()}</span>
              </div>
            )}
            {menu.off_peak_price && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">オフピーク</span>
                <span className="font-medium">¥{menu.off_peak_price.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuPreviewCard;