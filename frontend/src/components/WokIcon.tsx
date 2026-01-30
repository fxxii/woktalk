import React from 'react';

interface WokIconProps {
  className?: string;
}

const WokIcon: React.FC<WokIconProps> = ({ className = "w-full h-full" }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Intense Orange Flames - Dynamic & Minimalist */}
      <path 
        d="M25 82C25 82 28 65 35 70C42 75 48 60 55 72C62 84 75 60 80 82C80 82 60 95 50 95C40 95 25 82 25 82Z" 
        fill="#FF5722" 
        className="animate-pulse"
      />
      <path 
        d="M35 85C35 85 38 75 45 78C52 81 58 70 65 85C65 85 55 90 50 90C45 90 35 85 35 85Z" 
        fill="#FFC107" 
      />

      {/* Seasoned Carbon Steel Wok - Solid & Opaque */}
      {/* Outer Bowl - Deep Charcoal */}
      <path 
        d="M10 40C10 65 35 85 60 85C85 85 95 65 95 50L90 48C90 62 78 80 60 80C38 80 15 62 15 42L10 40Z" 
        fill="#121212" 
        stroke="#2A2A2A"
        strokeWidth="1"
      />
      
      {/* Interior Opaque Body - Slightly Lighter Carbon Steel */}
      <path 
        d="M10 40C10 58 35 75 60 75C85 75 95 55 95 48C95 48 85 52 60 52C35 52 10 38 10 38L10 40Z"
        fill="#1E1E1E"
      />

      {/* Seasoning Highlights */}
      <path 
        d="M20 65C35 73 60 73 80 62" 
        stroke="white" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        className="opacity-20"
      />
      <path 
        d="M15 50C15 60 40 70 60 70C75 70 85 60 85 50" 
        stroke="white" 
        strokeWidth="0.5" 
        strokeLinecap="round" 
        className="opacity-10"
      />

      {/* Dynamic Toss - Mid-air Ingredients */}
      <g>
        {/* Shrimp - Stylized C-Shape */}
        <path 
          d="M65 30C65 25 72 23 75 27C78 31 72 37 68 35C64 33 65 30 65 30Z" 
          fill="#FF8A80" 
          transform="rotate(-20 70 30)"
        />
        
        {/* Pepper - Clean Rect/Square */}
        <rect x="45" y="20" width="7" height="7" rx="1.5" transform="rotate(30 48 23)" fill="#4CAF50" />
        
        {/* Carrot - Sharp Triangle */}
        <path d="M55 35L65 40L62 33L55 35Z" fill="#FF9800" transform="rotate(10 60 36)"/>
        
        {/* Another Veggie Slice */}
        <rect x="30" y="35" width="4" height="10" rx="1" transform="rotate(-15 32 40)" fill="#8BC34A" />
      </g>
      
      {/* Subtle Motion Steam */}
      <path 
        d="M25 35C25 35 27 25 33 30" 
        stroke="white" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeDasharray="2 6"
        className="opacity-20"
      />
      <path 
        d="M80 30C80 30 82 20 88 25" 
        stroke="white" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeDasharray="2 6"
        className="opacity-20"
      />
    </svg>
  );
};

export default WokIcon;
