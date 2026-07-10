export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
      <span className="ml-3 text-sm text-gray-500">{message}</span>
    </div>
  );
}
