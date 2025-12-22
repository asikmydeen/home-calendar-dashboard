'use client';

const features = [
  {
    icon: '📅',
    title: 'Multi-Calendar Sync',
    description: 'Connect Google Calendar, Apple Calendar, and CalDAV accounts. See everyone\'s schedule in one unified view.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: '🎨',
    title: 'Custom Display Layouts',
    description: 'Design your perfect dashboard with drag-and-drop widgets. Create multiple pages for different rooms or purposes.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: '👨‍👩‍👧‍👦',
    title: 'Family Members',
    description: 'Add family members with their own color codes. Instantly see who has what planned at a glance.',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: '🧩',
    title: 'Smart Widgets',
    description: 'Clock, weather, notes, tasks, photos, and more. Build the perfect family command center.',
    gradient: 'from-orange-500 to-amber-500',
  },
  {
    icon: '📺',
    title: 'Remote Display Management',
    description: 'Control displays remotely from any device. Perfect for wall-mounted tablets and smart TVs.',
    gradient: 'from-red-500 to-pink-500',
  },
  {
    icon: '⚡',
    title: 'Real-time Sync',
    description: 'Changes appear instantly across all your displays. Always stay in sync with your family.',
    gradient: 'from-indigo-500 to-purple-500',
  },
];

export default function Features() {
  return (
    <section id="features" className="relative py-24 bg-slate-900/50">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/5 to-transparent" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Everything Your Family Needs
          </h2>
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto">
            Powerful features designed to keep your household organized and connected.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1"
            >
              {/* Gradient glow on hover */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
              
              <div className="relative z-10">
                {/* Icon */}
                <div className="text-4xl mb-4">{feature.icon}</div>
                
                {/* Title */}
                <h3 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                
                {/* Description */}
                <p className="text-white/60 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom decoration */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/50 text-sm">
            <span>✨</span>
            <span>More features coming soon</span>
          </div>
        </div>
      </div>
    </section>
  );
}
