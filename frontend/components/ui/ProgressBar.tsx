import React from 'react';

interface ProgressBarProps {
  spent: number;
  total: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ spent, total }) => {
  const percentage = total > 0 ? (spent / total) * 100 : 0;

  // Determine color based on the percentage, matching your backend logic
  let bgColor = 'bg-success-500'; // safe
  if (percentage >= 90) {
    bgColor = 'bg-danger-500'; // critical
  } else if (percentage >= 75) {
    bgColor = 'bg-warning-500'; // warning
  }

  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
      <div
        className={`${bgColor} h-2.5 rounded-full`}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};

export default ProgressBar;