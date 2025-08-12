import React from 'react';

interface SafeWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * エラーバウンダリを含むセーフラッパーコンポーネント
 */
class SafeWrapper extends React.Component<
  SafeWrapperProps,
  { hasError: boolean }
> {
  constructor(props: SafeWrapperProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('SafeWrapper caught error:', error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-red-800 font-semibold">エラーが発生しました</h3>
            <p className="text-red-600 text-sm mt-2">
              ページの読み込み中に問題が発生しました。
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              ページを再読み込み
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default SafeWrapper;