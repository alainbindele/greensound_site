/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		fontFamily: {
  			// Pairing "Crypto/Web3": Orbitron for futuristic display, Exo 2 for
  			// readable body copy.
  			display: ['Orbitron', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  			body: ['"Exo 2"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  			sans: ['"Exo 2"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  			mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 4px)',
  			sm: 'calc(var(--radius) - 8px)',
  			xl: 'calc(var(--radius) + 6px)',
  			'2xl': 'calc(var(--radius) + 14px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			// Brand tokens. `brand` is the theme-aware *text* green (always
  			// >= 4.5:1); `brand-solid` is for filled surfaces.
  			brand: {
  				DEFAULT: 'hsl(var(--brand))',
  				solid: 'hsl(var(--brand-solid))',
  				soft: 'hsl(var(--brand-soft))'
  			},
  			solar: 'hsl(var(--solar))',
  			signal: {
  				nature: 'hsl(var(--signal-nature))',
  				tech: 'hsl(var(--signal-tech))',
  				music: 'hsl(var(--signal-music))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		boxShadow: {
  			e1: 'var(--elevation-1)',
  			e2: 'var(--elevation-2)',
  			e3: 'var(--elevation-3)',
  			glow: 'var(--glow)'
  		},
  		transitionTimingFunction: {
  			out: 'var(--ease-out)',
  			organic: 'var(--ease-organic)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			},
  			'float-soft': {
  				'0%, 100%': { transform: 'translateY(0)' },
  				'50%': { transform: 'translateY(-10px)' }
  			},
  			shimmer: {
  				'100%': { transform: 'translateX(100%)' }
  			},
  			equalize: {
  				'0%, 100%': { transform: 'scaleY(0.35)' },
  				'50%': { transform: 'scaleY(1)' }
  			},
  			travel: {
  				'0%': { left: '0%', opacity: '0' },
  				'12%, 88%': { opacity: '1' },
  				'100%': { left: '100%', opacity: '0' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			// `--ambient` is driven to ~0 by the reduced-motion guard, which
  			// stretches these loops out of existence.
  			'float-soft': 'float-soft calc(6s / var(--ambient, 1)) ease-in-out infinite',
  			shimmer: 'shimmer 2s infinite',
  			equalize: 'equalize calc(1.1s / var(--ambient, 1)) ease-in-out infinite',
  			travel: 'travel calc(2.8s / var(--ambient, 1)) linear infinite'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
