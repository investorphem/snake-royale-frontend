'use client';

interface MobileNavProps {
  // FIXED: Expanded type safety matrix definitions to natively support the daily tournament panel destination
  activeTab: 'home' | 'shop' | 'inventory' | 'clans' | 'profile' | 'tournament';
  setActiveTab: (tab: 'home' | 'shop' | 'inventory' | 'clans' | 'profile' | 'tournament') => void;
}

export default function MobileNav({ activeTab, setActiveTab }: MobileNavProps) {
  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'tournament', label: 'Grand Prix', icon: '🏆' }, // UPDATED: Injected easy shortcut access to cash reward brackets
    { id: 'shop', label: 'Shop', icon: '🛒' },
    { id: 'inventory', label: 'Assets', icon: '🎒' },
    { id: 'clans', label: 'Syndicate', icon: '🛡️' },
  ] as const;

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-[#0B0F17]/95 backdrop-blur-md border-t border-white/5 z-50 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      <div className="flex justify-between items-center px-4 py-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'text-[#22c55e]' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span className={`text-2xl mb-0.5 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'scale-100 opacity-60'} transition-all`}>
                {item.icon}
              </span>
              <span className={`text-[9px] font-black tracking-wider uppercase ${isActive ? 'text-[#22c55e]' : 'text-gray-600'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}