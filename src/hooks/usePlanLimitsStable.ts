import { useContext, useRef, useEffect } from 'react';
import { PlanLimitsContext, getPlanLimitsContext } from '../contexts/PlanLimitsContext';

/**
 * 本番環境でのビルド最適化に対応した安定版フック
 * React 18のSuspenseやlazy loadingとの相互作用を考慮
 */
export function usePlanLimitsStable() {
  // useRefで前回の値を保持
  const previousValueRef = useRef(getPlanLimitsContext());
  
  try {
    // コンテキストから値を取得
    const contextValue = useContext(PlanLimitsContext);
    
    // 値が有効な場合は更新
    if (contextValue) {
      previousValueRef.current = contextValue;
      return contextValue;
    }
    
    // コンテキストが見つからない場合は前回の値かデフォルト値を返す
    return previousValueRef.current;
  } catch (error) {
    // エラーが発生した場合も前回の値を返す
    console.warn('usePlanLimitsStable: Fallback to previous value', error);
    return previousValueRef.current;
  }
}

/**
 * SSR/SSGセーフな実装
 * サーバーサイドレンダリング時にも安全に動作
 */
export function usePlanLimitsSSR() {
  // ブラウザ環境かどうかをチェック
  const isClient = typeof window !== 'undefined';
  
  if (!isClient) {
    // サーバーサイドではデフォルト値を返す
    return getPlanLimitsContext();
  }
  
  // クライアントサイドでは通常のフックを使用
  return usePlanLimitsStable();
}