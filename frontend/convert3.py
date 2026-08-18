import re

with open(r'd:\wattwise-project\frontend\src\pages\LandingPage.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace <a> with <Link>
content = content.replace('<a\n', '<Link\n')
content = content.replace('<a ', '<Link ')
content = content.replace('</a>', '</Link>')

# Replace href="#" with to="/"
content = content.replace('href="#"', 'to="/"')

# Change specific Get Started buttons
content = content.replace('<button className="hidden sm:block px-6 py-2 bg-primary text-on-primary font-label-caps text-label-caps uppercase tracking-wider rounded-lg hover:shadow-[0_0_20px_rgba(164,230,255,0.4)] transition-all active:scale-95">', 
                          '<Link to="/auth" className="hidden sm:block px-6 py-2 bg-primary text-on-primary font-label-caps text-label-caps uppercase tracking-wider rounded-lg hover:shadow-[0_0_20px_rgba(164,230,255,0.4)] transition-all active:scale-95">')

content = content.replace('Get Started\n            </button>', 'Get Started\n            </Link>')
content = content.replace('Get Started</button>', 'Get Started</Link>')

# Button 2
content = content.replace('<button className="px-8 py-4 bg-primary text-on-primary font-label-caps text-label-caps uppercase tracking-wider rounded-lg hover:shadow-[0_0_24px_rgba(164,230,255,0.4)] transition-all active:scale-95 flex items-center gap-2 relative overflow-hidden group">',
                          '<Link to="/auth" className="px-8 py-4 bg-primary text-on-primary font-label-caps text-label-caps uppercase tracking-wider rounded-lg hover:shadow-[0_0_24px_rgba(164,230,255,0.4)] transition-all active:scale-95 flex items-center gap-2 relative overflow-hidden group">')
content = content.replace('          </button>\n          <button className="px-8 py-4 bg-transparent', '          </Link>\n          <button className="px-8 py-4 bg-transparent')

# Button 3
content = content.replace('<button className="mt-8 px-10 py-5 bg-vibrant-violet text-white font-label-caps text-[16px] uppercase tracking-widest rounded-xl shadow-[0_0_40px_rgba(139,92,246,0.4)] hover:shadow-[0_0_60px_rgba(139,92,246,0.6)] hover:bg-white hover:text-vibrant-violet transition-all duration-300 active:scale-95 group relative overflow-hidden">',
                          '<Link to="/auth" className="mt-8 px-10 py-5 bg-vibrant-violet text-white font-label-caps text-[16px] uppercase tracking-widest rounded-xl shadow-[0_0_40px_rgba(139,92,246,0.4)] hover:shadow-[0_0_60px_rgba(139,92,246,0.6)] hover:bg-white hover:text-vibrant-violet transition-all duration-300 active:scale-95 group relative overflow-hidden">')
content = content.replace('            </button>\n          </div>', '            </Link>\n          </div>')

with open(r'd:\wattwise-project\frontend\src\pages\LandingPage.js', 'w', encoding='utf-8') as out:
    out.write(content)

print("Safely replaced")
