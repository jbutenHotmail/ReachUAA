import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t border-gray-200 py-4 px-6 hidden md:block">
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center">
        <div className="text-sm text-gray-600 mb-2 sm:mb-0">
          &copy; {currentYear} Reach UAA. All rights reserved. Developed by Wilmer Buten.
        </div>
        <div className="text-sm text-gray-500">
          Version 1.0.0
        </div>
      </div>
    </footer>
  );
};

export default Footer;