import Link from "next/link";
import Image from "next/image";
import { AirVent, ArrowRight, Award, BadgeCheck, Bell, Calendar, CheckCircle2, Clock, Droplets, Facebook, Fan, Gauge, HeartHandshake, Home, Instagram, MessageSquare, Phone, Settings, ShieldCheck, Star, Thermometer, Users, Wrench, Zap } from "lucide-react";

const stats = [
	{
		label: "Projects completed",
		value: "5,200+",
		delta: "Across UAE",
	},
	{
		label: "Customer satisfaction",
		value: "98%",
		delta: "5-star reviews",
	},
	{
		label: "Response time",
		value: "< 2 hrs",
		delta: "Emergency services",
	},
];

const services = [
	{
		title: "AC Installation",
		desc: "Professional installation of residential and commercial air conditioning systems with warranty and quality guarantee.",
		icon: AirVent,
	},
	{
		title: "AC Maintenance",
		desc: "Regular servicing, cleaning, and preventive maintenance to keep your AC running efficiently year-round.",
		icon: Settings,
	},
	{
		title: "AC Repair",
		desc: "Fast and reliable repair services for all AC brands and models with genuine parts and expert technicians.",
		icon: Wrench,
	},
	{
		title: "Emergency Service",
		desc: "24/7 emergency AC repair services available across all emirates with rapid response time.",
		icon: Zap,
	},
	{
		title: "Duct Cleaning",
		desc: "Comprehensive duct cleaning and sanitization services to improve air quality and system efficiency.",
		icon: Fan,
	},
	{
		title: "Consultation",
		desc: "Expert consultation for AC system selection, energy efficiency upgrades, and building cooling solutions.",
		icon: Gauge,
	},
];

const features = [
	{
		title: "Certified technicians",
		desc: "Our team consists of certified and trained AC specialists with years of experience.",
		icon: BadgeCheck,
	},
	{
		title: "Warranty coverage",
		desc: "All installations and repairs come with comprehensive warranty and parts guarantee.",
		icon: ShieldCheck,
	},
	{
		title: "Genuine parts",
		desc: "We use only authentic manufacturer parts to ensure longevity and performance.",
		icon: Award,
	},
	{
		title: "Competitive pricing",
		desc: "Transparent pricing with no hidden charges and flexible payment options available.",
		icon: Star,
	},
];

const process = [
	{
		title: "Book a service",
		desc: "Schedule an appointment online or call us for immediate assistance.",
		icon: Calendar,
	},
	{
		title: "Inspection & quote",
		desc: "Our technician visits your location, inspects the requirements, and provides a detailed quote.",
		icon: Thermometer,
	},
	{
		title: "Professional work",
		desc: "Our certified team completes the installation or repair with quality workmanship.",
		icon: Wrench,
	},
	{
		title: "Quality check",
		desc: "Final testing and quality assurance to ensure optimal performance and your satisfaction.",
		icon: CheckCircle2,
	},
];

export default function LandingPage() {
	return (
		<div className='relative overflow-hidden'>
			{/* Fixed Navigation - Floating Dock */}
			<nav className='fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-6xl rounded-2xl border border-slate-200/60 bg-white/80 shadow-lg backdrop-blur-sm'>
				<div className='flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 md:px-10'>
					{/* Logo Section */}
					<div className='flex items-center gap-2 min-w-max'>
						<div className='flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#1ca5e4] to-blue-600 flex-shrink-0'>
							<AirVent className='h-6 w-6 text-white' />
						</div>
						<div className='hidden sm:block'>
							<div className='text-base sm:text-lg font-bold text-slate-900'>Fahad Al Sharq</div>
							<div className='text-xs text-slate-600'>AC Systems LLC</div>
						</div>
					</div>

					{/* Spacer */}
					<div className='flex-1' />

					{/* Buttons Section */}
					<div className='flex items-center gap-2 sm:gap-3'>
						<Link href='/complain' className='hidden sm:inline-flex rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 transition hover:bg-slate-100'>
							Submit complaint
						</Link>
						<Link href='/login' className='inline-flex items-center gap-1 sm:gap-2 rounded-lg bg-[#1ca5e4] px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-[#1ca5e4]/25 transition hover:bg-[#1693cd] hover:shadow-lg'>
							<span className='hidden sm:inline'>Staff Signin</span>
							<span className='sm:hidden'>Sign In</span>
							<ArrowRight className='h-4 w-4' />
						</Link>
					</div>
				</div>
			</nav>

			{/* Hero Section - Full Width with space for fixed navbar */}
			<header className='relative w-screen left-1/2 right-1/2 -mx-[50vw] min-h-[700px] overflow-hidden lg:min-h-[800px] pt-20'>
				{/* Background Image */}
				<Image src='/hero.jpg' alt='Professional AC technician working on installation' fill className='absolute inset-0 h-full w-full object-cover' priority />

				{/* Dark gradient overlay - left to right for better text contrast */}
				<div className='absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30' />

				{/* Animated accent shapes */}
				<div className='pointer-events-none absolute inset-0 overflow-hidden'>
					<div className='absolute -right-32 top-20 h-80 w-80 rounded-full bg-[#1ca5e4]/10 blur-3xl' />
					<div className='absolute -bottom-32 right-1/4 h-96 w-96 rounded-full bg-[#1ca5e4]/5 blur-3xl' />
				</div>

				{/* Content */}
				<div className='relative z-10 flex h-full flex-col justify-between px-6 py-12 sm:px-12 lg:py-16'>
					<div className='space-y-8 max-w-2xl'>
						<div className='inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur-sm w-fit'>
							<ShieldCheck className='h-4 w-4' />
							<span>Licensed & Certified AC Services in UAE</span>
						</div>
						<div className='space-y-6'>
							<h1 className='text-balance text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl drop-shadow-lg'>Your trusted partner for AC solutions</h1>
							<p className='text-lg leading-relaxed text-white/90 sm:text-xl drop-shadow-md'>Professional air conditioning installation, maintenance, and repair services across all Emirates. Available 24/7 for emergencies with certified technicians and genuine parts.</p>
						</div>
						<div className='flex flex-wrap gap-3 mb-4'>
							<Link href='/complain' className='group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1ca5e4] to-blue-600 px-7 py-4 text-base font-semibold text-white shadow-lg shadow-[#1ca5e4]/50 transition hover:scale-[1.02] hover:shadow-xl hover:shadow-[#1ca5e4]/60'>
								Book a service/complain
								<ArrowRight className='h-5 w-5 transition-transform group-hover:translate-x-1' />
							</Link>
						</div>
					</div>

					{/* Bottom Stats Cards */}
					<div className='grid gap-4 sm:grid-cols-3 max-w-2xl'>
						{stats.map((item) => (
							<div key={item.label} className='rounded-2xl border border-white/20 bg-white/10 p-5 shadow-lg backdrop-blur-md transition hover:bg-white/15 hover:border-white/30'>
								<div className='text-sm font-medium text-white/80'>{item.label}</div>
								<div className='mt-2 text-3xl font-bold text-[#1ca5e4] drop-shadow-md'>{item.value}</div>
								<div className='text-xs text-white/70'>{item.delta}</div>
							</div>
						))}
					</div>
				</div>
			</header>

			{/* Rest of content */}
			<div className='relative mx-auto flex max-w-7xl flex-col gap-20 px-6 pb-20 sm:px-10 mt-6'>
				{/* Services Section */}
				<section className='space-y-8'>
					<div className='text-center'>
						<div className='inline-flex items-center gap-2 rounded-full bg-[#1ca5e4]/10 px-4 py-2 text-sm font-medium text-[#1ca5e4]'>
							<AirVent className='h-4 w-4' />
							<span>Comprehensive AC Solutions</span>
						</div>
						<h2 className='mt-4 text-3xl font-bold text-slate-900 sm:text-4xl'>Our services</h2>
						<p className='mx-auto mt-3 max-w-2xl text-lg text-slate-600'>From installation to maintenance, we handle all your air conditioning needs with expertise and care.</p>
					</div>
					<div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
						{services.map(({ title, desc, icon: Icon }) => (
							<div key={title} className='group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition hover:shadow-xl hover:shadow-[#1ca5e4]/10'>
								<div className='absolute inset-0 bg-gradient-to-br from-[#1ca5e4]/0 to-[#1ca5e4]/5 opacity-0 transition group-hover:opacity-100' />
								<div className='relative space-y-4'>
									<div className='inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-[#1ca5e4] to-blue-600 p-3 shadow-md shadow-[#1ca5e4]/25'>
										<Icon className='h-6 w-6 text-white' />
									</div>
									<div>
										<div className='text-xl font-bold text-slate-900'>{title}</div>
										<p className='mt-2 text-sm leading-relaxed text-slate-600'>{desc}</p>
									</div>
									{/* <div className='flex items-center gap-2 text-sm font-semibold text-[#1ca5e4]'>
										Learn more
										<ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-1' />
									</div> */}
								</div>
							</div>
						))}
					</div>
				</section>

				{/* Why Choose Us */}
				<section className='space-y-8'>
					<div className='text-center'>
						<h2 className='text-3xl font-bold text-slate-900 sm:text-4xl'>Why choose Fahad Al Sharq?</h2>
						<p className='mx-auto mt-3 max-w-2xl text-lg text-slate-600'>We combine technical expertise with exceptional customer service to deliver the best AC solutions.</p>
					</div>
					<div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-4'>
						{features.map(({ title, desc, icon: Icon }) => (
							<div key={title} className='rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur-sm'>
								<div className='inline-flex items-center justify-center rounded-lg bg-[#1ca5e4]/10 p-2.5'>
									<Icon className='h-5 w-5 text-[#1ca5e4]' />
								</div>
								<div className='mt-4 text-lg font-bold text-slate-900'>{title}</div>
								<p className='mt-2 text-sm text-slate-600'>{desc}</p>
							</div>
						))}
					</div>
				</section>

				{/* How It Works */}
				<section className='space-y-8 rounded-3xl border border-slate-200/60 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 p-8 shadow-xl sm:p-12'>
					<div className='text-center'>
						<h2 className='text-3xl font-bold text-slate-900 sm:text-4xl'>How it works</h2>
						<p className='mx-auto mt-3 max-w-2xl text-lg text-slate-600'>Simple, transparent, and hassle-free process from booking to completion.</p>
					</div>
					<div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-4'>
						{process.map(({ title, desc, icon: Icon }, idx) => (
							<div key={title} className='relative rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-sm'>
								<div className='mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#1ca5e4] to-blue-600 font-bold text-white shadow-md shadow-[#1ca5e4]/25'>{idx + 1}</div>
								<div className='mb-3 flex items-center gap-2'>
									<Icon className='h-5 w-5 text-[#1ca5e4]' />
									<div className='text-lg font-bold text-slate-900'>{title}</div>
								</div>
								<p className='text-sm text-slate-600'>{desc}</p>
							</div>
						))}
					</div>
				</section>

				{/* Quick Complaint Submission CTA */}
				<section className='rounded-3xl border-4 border-[#1ca5e4]/40 bg-gradient-to-br from-[#1ca5e4]/15 via-blue-50/60 to-white p-8 shadow-2xl sm:p-12 relative'>
					<div className='absolute -top-4 left-6 inline-flex items-center gap-2 rounded-full bg-[#1ca5e4] px-5 py-2 text-sm font-bold text-white shadow-lg'>
						<span className='text-xl'>⚠️</span>
						<span>Submit Your Complaint Now</span>
					</div>
					<div className='mt-4 text-center'>
						<h2 className='text-3xl font-bold text-slate-900 sm:text-4xl'>Having an issue with our service?</h2>
						<p className='mx-auto mt-4 max-w-2xl text-lg text-slate-700 font-medium'>We want to hear from you! Click the button below to report your complaint and we'll resolve it quickly.</p>
						<Link href='/complain' className='mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1ca5e4] to-blue-600 px-10 py-6 text-xl font-bold text-white shadow-xl shadow-[#1ca5e4]/40 transition hover:scale-105 hover:shadow-2xl'>
							<MessageSquare className='h-6 w-6' />
							Submit Complaint
							<ArrowRight className='h-6 w-6' />
						</Link>
					</div>
				</section>

				{/* Detailed Complaint System Info */}
				<section className='rounded-3xl border border-[#1ca5e4]/20 bg-gradient-to-br from-[#1ca5e4]/10 via-blue-50/50 to-white p-8 shadow-xl sm:p-12'>
					<div className='grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center'>
						<div className='space-y-5'>
							<div className='inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1ca5e4] shadow-sm'>
								<MessageSquare className='h-4 w-4' />
								<span>Customer support portal</span>
							</div>
							<h2 className='text-3xl font-bold text-slate-900 sm:text-4xl'>Have a concern? We're here to help.</h2>
							<p className='text-lg text-slate-600'>Our dedicated complaint management system ensures your feedback is heard and resolved promptly with full transparency.</p>
							<div className='space-y-3'>
								<div className='flex items-center gap-3'>
									<div className='flex h-8 w-8 items-center justify-center rounded-lg bg-[#1ca5e4]/10'>
										<CheckCircle2 className='h-5 w-5 text-[#1ca5e4]' />
									</div>
									<span className='font-medium text-slate-700'>Track complaint status in real-time</span>
								</div>
								<div className='flex items-center gap-3'>
									<div className='flex h-8 w-8 items-center justify-center rounded-lg bg-[#1ca5e4]/10'>
										<Bell className='h-5 w-5 text-[#1ca5e4]' />
									</div>
									<span className='font-medium text-slate-700'>Receive updates via email and SMS</span>
								</div>
								<div className='flex items-center gap-3'>
									<div className='flex h-8 w-8 items-center justify-center rounded-lg bg-[#1ca5e4]/10'>
										<HeartHandshake className='h-5 w-5 text-[#1ca5e4]' />
									</div>
									<span className='font-medium text-slate-700'>Direct communication with our team</span>
								</div>
							</div>
						</div>
						<div className='flex flex-col gap-4'>
							<Link href='/complain' className='inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1ca5e4] to-blue-600 px-8 py-5 text-lg font-semibold text-white shadow-lg shadow-[#1ca5e4]/30 transition hover:scale-[1.02] hover:shadow-xl'>
								Submit a complaint
								<ArrowRight className='h-5 w-5' />
							</Link>
							<Link href='/login' className='inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-8 py-5 text-lg font-semibold text-slate-800 shadow-sm transition hover:border-[#1ca5e4]/30 hover:bg-slate-50'>
								Staff dashboard
								<Users className='h-5 w-5 text-[#1ca5e4]' />
							</Link>
						</div>
					</div>
				</section>

				{/* Final CTA */}
				<section className='rounded-3xl border border-slate-200/60 bg-gradient-to-br from-slate-900 to-slate-800 p-8 shadow-2xl sm:p-12'>
					<div className='text-center'>
						<h2 className='text-3xl font-bold text-white sm:text-4xl'>Ready to experience superior AC service?</h2>
						<p className='mx-auto mt-4 max-w-2xl text-lg text-slate-300'>Contact us today for a free consultation and quote. Available 24/7 for emergencies.</p>
						<div className='mt-8 flex flex-wrap items-center justify-center gap-4'>
							<Link href='/complain' className='inline-flex items-center gap-2 rounded-xl bg-[#1ca5e4] px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-[#1ca5e4]/40 transition hover:bg-[#1693cd] hover:shadow-xl'>
								Book now
								<ArrowRight className='h-5 w-5' />
							</Link>
							{/* <Link href='tel:+971XXXXXXXX' className='inline-flex items-center gap-2 rounded-xl border-2 border-white/20 bg-white/10 px-8 py-4 text-lg font-semibold text-white backdrop-blur-sm transition hover:bg-white/20'>
								<Phone className='h-5 w-5' />
								Call +971 XX XXX XXXX
							</Link> */}
						</div>
					</div>
				</section>

				{/* Footer */}
				<footer className='border-t border-slate-200 pt-8'>
					<div className='space-y-6'>
						<div className='flex flex-col items-center gap-4 sm:flex-row sm:justify-center'>
							<a href='https://www.facebook.com/fahad.al.sharq' target='_blank' rel='noopener noreferrer' className='flex items-center gap-2 rounded-lg bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-200'>
								<Facebook className='h-5 w-5' />
								Follow on Facebook
							</a>
							<a href='https://www.instagram.com/fahadalsharq169/' target='_blank' rel='noopener noreferrer' className='flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 transition hover:from-purple-200 hover:to-pink-200'>
								<Instagram className='h-5 w-5' color='white' />
								Follow on Instagram
							</a>
						</div>
						<div className='text-center text-sm text-slate-600'>
							<p>&copy; {new Date().getFullYear()} Fahad Al Sharq AC Systems LLC. All rights reserved.</p>
							<p className='mt-2'>Licensed AC contractor serving all Emirates</p>
						</div>
					</div>
				</footer>
			</div>
		</div>
	);
}
