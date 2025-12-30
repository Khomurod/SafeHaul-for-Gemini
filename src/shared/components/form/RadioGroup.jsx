import React from 'react';

const RadioGroup = ({ 
  label, 
  name, 
  options = [], 
  value, 
  onChange, 
  required = false,
  horizontal = true, // Default to side-by-side for Yes/No
  helperText
}) => {
  return (
    <div className="flex flex-col w-full mb-2">
      {/* Label: Matches InputField Style */}
      {label && (
        <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
      )}

      <div className={`grid gap-3 ${horizontal ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {options.map((option) => {
            const isSelected = String(value) === String(option.value);
            
            return (
                <label 
                    key={option.value}
                    className={`
                        relative flex items-center p-3 sm:p-4 border rounded-lg cursor-pointer transition-all duration-200
                        ${isSelected 
                            ? 'border-blue-600 bg-blue-50 text-blue-800 ring-1 ring-blue-600 shadow-sm' 
                            : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
                        }
                    `}
                >
                    <input
                        type="radio"
                        name={name}
                        value={option.value}
                        checked={isSelected}
                        onChange={() => onChange(name, option.value)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
                    />
                    <span className={`ml-3 text-sm font-medium ${isSelected ? 'font-bold' : 'text-gray-700'}`}>
                        {option.label}
                    </span>
                </label>
            );
        })}
      </div>

      {/* Helper Text */}
      {helperText && (
        <p className="text-xs text-gray-500 mt-1.5">{helperText}</p>
      )}
    </div>
  );
};

export default RadioGroup;
