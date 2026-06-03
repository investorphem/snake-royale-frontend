'use client';

interface MobileNavProps {
  activeTab: 'home' | 'shop' | 'inventory' | 'clans' | 'profile' | 'tournament';
  setActiveTab: (tab: 'home' | 'shop' | 'inventory' | 'clans' | 'profile' | 'tournament') => void;
}

export default function MobileNav({ activeTab, setActiveTab }: MobileNavProps) {
  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'shop', label: 'Shop', icon: '🛒' },
    { id: 'inventory', label: 'Inventory', icon: '🎒' },
    { id: 'clans', label: 'Clans', icon: '🛡️' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ] as const;

  return (
    // Removed lg:hidden so the app footer acts as the primary navigation everywhere!
    <div className="fixed bottom-0 left-0 right-0 bg-[#06090E]/95 backdrop-blur-xl border-t border-white/5 z-[100] pb-safe shadow-[0_-20px_40px_rgba(0,0,0,0.8)]">
      <div className="flex justify-between items-center px-6 py-3 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 ${
                isActive 
                  ? 'text-[#84cc16]' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span className={`text-2xl mb-1 ${isActive ? 'scale-110 drop-shadow-[0_0_10px_rgba(132,204,22,0.6)]' : 'scale-100 opacity-60'} transition-all`}>
                {item.icon}
              </span>
              <span className={`text-[9px] font-black tracking-wider ${isActive ? 'text-[#84cc16]' : 'text-gray-600'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}