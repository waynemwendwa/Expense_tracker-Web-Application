'use client'

import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Define the validation rules
const passwordRules = [
  { id: 'length', text: 'At least 8 characters long', regex: /.{8,}/ },
  { id: 'uppercase', text: 'At least one uppercase letter', regex: /[A-Z]/ },
  { id: 'lowercase', text: 'At least one lowercase letter', regex: /[a-z]/ },
  { id: 'number', text: 'At least one number', regex: /[0-9]/ },
  { id: 'special', text: 'At least one special character (!@#$%^&*)', regex: /[!@#$%^&*]/ },
];

interface PasswordStrengthProps {
  password?: string;
}

const Requirement = ({ isValid, text }: { isValid: boolean, text: string }) => {
  return (
    <div className={cn(
      "flex items-center text-sm transition-colors",
      isValid ? "text-green-600" : "text-red-500"
    )}>
      {isValid ? (
        <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 mr-2 flex-shrink-0" />
      )}
      <span>{text}</span>
    </div>
  );
};


export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password = '' }) => {
  // Check which rules the current password passes
  const validationResults = passwordRules.map(rule => ({
    ...rule,
    isValid: rule.regex.test(password),
  }));

  // Don't show the indicator if the user hasn't started typing
  if (password.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mt-3 p-3 bg-gray-50 rounded-md">
      {validationResults.map(rule => (
        <Requirement key={rule.id} isValid={rule.isValid} text={rule.text} />
      ))}
    </div>
  );
};