import { Search, Bell, CircleUser } from 'lucide-react'

export default function Header() {
  return (
    <header className="w-full bg-carbon border-b border-border-default">
      <div className="flex items-center gap-4 px-5 h-[52px]">

        {/* Logo mark */}
        <div className="shrink-0">
          <svg width="28" height="28" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M13.8574 19.5713C13.8574 23.9896 17.4391 27.5713 21.8574 27.5713H24.1426C24.1426 29.4649 22.6075 31 20.7139 31H15C10.5817 31 7 27.4183 7 23V17.2861C7 13.4989 10.0702 10.4287 13.8574 10.4287V19.5713ZM23 7C27.4183 7 31 10.5817 31 15V20.7139C31 24.5011 27.9298 27.5713 24.1426 27.5713V18.4287C24.1426 14.0104 20.5609 10.4287 16.1426 10.4287H13.8574C13.8574 8.53509 15.3925 7 17.2861 7H23Z"
              fill="#E8E6E3"
            />
          </svg>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-2.5 w-[320px] h-8 px-3 rounded-lg bg-graphite border border-border-default">
          <Search size={14} className="text-dust shrink-0" />
          <input
            type="text"
            placeholder="Search simulations by name"
            className="flex-1 bg-transparent text-sm text-bone placeholder:text-dust outline-none"
          />
        </div>

        {/* Right icons */}
        <div className="ml-auto flex items-center gap-4">
          <Bell size={18} className="text-dust" />
          <CircleUser size={18} className="text-dust" />
        </div>

      </div>
    </header>
  )
}
