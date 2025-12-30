import React from 'react';

const InputField = ({ 
  label, 
  type = "text", 
  id, 
  name, 
  value, 
  onChange, 
  required = false, 
  placeholder, 
  className = "",
  disabled = false,
  min,
  max,
  helperText, // New: Pass instructions directly
  error       // New: Pass error messages directly
}) => {
  return (
    <div className={`flex flex-col w-full ${className}`}>
      {/* Label: Bold, Uppercase, High Contrast */}
      {label && (
        <label htmlFor={id} className="block text-sm font-bold text-gray-900 mb-1.5 uppercase tracking-wide">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
      )}
      
      {/* Input: Taller, Cleaner, Mobile-Friendly */}
      <input
        type={type}
        id={id}
        name={name}
        value={value || ""}
        onChange={(e) => onChange(e.target.name, e.target.value)}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        className={`
            w-full p-4 text-base text-gray-900 bg-white border rounded-lg shadow-sm transition-all duration-200
            placeholder:text-gray-400 
            focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 hover:border-gray-400'}
        `}
      />

      {/* Helper / Error Text */}
      {(error || helperText) && (
        <p className={`text-xs mt-1.5 font-medium ${error ? 'text-red-600 flex items-center gap-1' : 'text-gray-500'}`}>
            {error && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
            )}
            {error || helperText}
        </p>
      )}
    </div>
  );
};

export default InputField;
