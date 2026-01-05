import Link from "next/link";
import { AirVent, ArrowRight, Award, BadgeCheck, Bell, Calendar, CheckCircle2, Clock, Droplets, Fan, Gauge, HeartHandshake, Home, MessageSquare, Phone, Settings, ShieldCheck, Star, Thermometer, Users, Wrench, Zap } from "lucide-react";

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
		<div className='relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/30'>
			<div className='pointer-events-none absolute inset-0 opacity-40'>
				<div className='absolute -right-20 top-0 h-96 w-96 rounded-full bg-[#1ca5e4]/20 blur-3xl' />
				<div className='absolute bottom-0 left-0 h-80 w-80 rounded-full bg-[#1ca5e4]/15 blur-3xl' />
				<div className='absolute right-1/3 top-1/3 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl' />
			</div>

			<div className='relative mx-auto flex max-w-7xl flex-col gap-20 px-6 pb-20 pt-8 sm:px-10 lg:pt-16'>
				{/* Navigation */}
				<nav className='flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white/80 px-6 py-4 shadow-sm backdrop-blur-sm'>
					<div className='flex items-center gap-2'>
						<div className='flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#1ca5e4] to-blue-600'>
							<AirVent className='h-6 w-6 text-white' />
						</div>
						<div>
							<div className='text-lg font-bold text-slate-900'>Fahad Al Sharq</div>
							<div className='text-xs text-slate-600'>AC Systems LLC</div>
						</div>
					</div>
					<div className='flex items-center gap-3'>
						<Link href='/customer' className='hidden sm:inline-flex rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100'>
							Submit complaint
						</Link>
						<Link href='/auth/login' className='inline-flex items-center gap-2 rounded-lg bg-[#1ca5e4] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#1ca5e4]/25 transition hover:bg-[#1693cd] hover:shadow-lg'>
							Dashboard
							<ArrowRight className='h-4 w-4' />
						</Link>
					</div>
				</nav>

				{/* Hero Section */}
				<header className='grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center'>
					<div className='space-y-8'>
						<div className='inline-flex items-center gap-2 rounded-full bg-[#1ca5e4]/10 px-4 py-2 text-sm font-medium text-[#1ca5e4] ring-1 ring-[#1ca5e4]/20'>
							<ShieldCheck className='h-4 w-4' />
							<span>Licensed & Certified AC Services in UAE</span>
						</div>
						<div className='space-y-5'>
							<h1 className='text-balance text-5xl font-bold leading-tight tracking-tight text-slate-900 sm:text-6xl lg:text-7xl'>Your trusted partner for AC solutions</h1>
							<p className='text-lg leading-relaxed text-slate-600 sm:text-xl'>Professional air conditioning installation, maintenance, and repair services across all Emirates. Available 24/7 for emergencies with certified technicians and genuine parts.</p>
						</div>
						<div className='flex flex-wrap gap-3'>
							<Link href='/customer' className='group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1ca5e4] to-blue-600 px-7 py-4 text-base font-semibold text-white shadow-lg shadow-[#1ca5e4]/30 transition hover:scale-[1.02] hover:shadow-xl hover:shadow-[#1ca5e4]/40'>
								Book a service
								<ArrowRight className='h-5 w-5 transition-transform group-hover:translate-x-1' />
							</Link>
							<Link href='tel:+971XXXXXXXX' className='inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-7 py-4 text-base font-semibold text-slate-800 shadow-sm transition hover:border-[#1ca5e4]/30 hover:bg-slate-50'>
								<Phone className='h-5 w-5 text-[#1ca5e4]' />
								Call us now
							</Link>
						</div>
						<div className='grid gap-4 sm:grid-cols-3'>
							{stats.map((item) => (
								<div key={item.label} className='rounded-2xl border border-slate-200/60 bg-white/70 p-5 shadow-sm backdrop-blur-sm'>
									<div className='text-sm font-medium text-slate-600'>{item.label}</div>
									<div className='mt-2 text-3xl font-bold text-[#1ca5e4]'>{item.value}</div>
									<div className='text-xs text-slate-500'>{item.delta}</div>
								</div>
							))}
						</div>
					</div>
					<div className='relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white/70 p-6 shadow-2xl backdrop-blur-sm'>
						<div className='absolute inset-0 bg-gradient-to-br from-[#1ca5e4]/5 via-white/50 to-blue-100/30' />
						<div className='relative space-y-6'>
							<div className='flex items-center justify-between'>
								<div className='inline-flex items-center gap-2 text-sm font-semibold text-slate-700'>
									<Thermometer className='h-4 w-4 text-[#1ca5e4]' /> Live service status
								</div>
								<span className='rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700'>All teams active</span>
							</div>
							<div className='space-y-4 rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-sm'>
								<div className='flex items-center justify-between'>
									<div className='inline-flex items-center gap-2 text-sm font-medium text-slate-600'>
										<Home className='h-4 w-4 text-[#1ca5e4]' /> Active service areas
									</div>
									<span className='text-xs font-semibold text-slate-700'>7 Emirates</span>
								</div>
								<div className='grid gap-3 sm:grid-cols-2'>
									<div className='rounded-xl border border-slate-200/60 bg-gradient-to-br from-[#1ca5e4]/5 to-blue-50/50 p-4'>
										<div className='text-xs font-medium text-slate-600'>Available technicians</div>
										<div className='mt-1 text-2xl font-bold text-slate-900'>42</div>
										<p className='text-xs text-slate-500'>Ready to serve</p>
									</div>
									<div className='rounded-xl border border-slate-200/60 bg-gradient-to-br from-emerald-50 to-green-50/50 p-4'>
										<div className='text-xs font-medium text-slate-600'>Response time</div>
										<div className='mt-1 text-2xl font-bold text-slate-900'>1.8h</div>
										<p className='text-xs text-slate-500'>Average arrival</p>
									</div>
								</div>
							</div>
							<div className='grid gap-4 sm:grid-cols-2'>
								<div className='rounded-2xl border border-slate-200/60 bg-white/80 p-4 shadow-sm'>
									<div className='flex items-center justify-between text-sm'>
										<span className='inline-flex items-center gap-2 font-medium text-slate-600'>
											<Clock className='h-4 w-4 text-[#1ca5e4]' /> Today
										</span>
										<span className='text-xs font-semibold text-[#1ca5e4]'>18 bookings</span>
									</div>
									<div className='mt-3 space-y-2 text-sm'>
										<div className='flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2'>
											<span className='text-slate-700'>Installations</span>
											<span className='font-semibold text-slate-900'>6</span>
										</div>
										<div className='flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2'>
											<span className='text-slate-700'>Maintenance</span>
											<span className='font-semibold text-slate-900'>9</span>
										</div>
									</div>
								</div>
								<div className='rounded-2xl border border-slate-200/60 bg-white/80 p-4 shadow-sm'>
									<div className='flex items-center justify-between text-sm'>
										<span className='inline-flex items-center gap-2 font-medium text-slate-600'>
											<Star className='h-4 w-4 text-[#1ca5e4]' /> Rating
										</span>
										<span className='text-xs font-semibold text-[#1ca5e4]'>4.9/5.0</span>
									</div>
									<div className='mt-3 space-y-1'>
										<div className='flex items-center gap-2'>
											<div className='h-2 flex-1 overflow-hidden rounded-full bg-slate-100'>
												<div className='h-full w-[98%] bg-gradient-to-r from-[#1ca5e4] to-blue-500' />
											</div>
											<span className='text-xs font-semibold text-slate-700'>98%</span>
										</div>
										<p className='text-xs text-slate-500'>Customer satisfaction</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</header>

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
									<div className='flex items-center gap-2 text-sm font-semibold text-[#1ca5e4]'>
										Learn more
										<ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-1' />
									</div>
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

				{/* Complaint System CTA */}
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
							<Link href='/customer' className='inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1ca5e4] to-blue-600 px-8 py-5 text-lg font-semibold text-white shadow-lg shadow-[#1ca5e4]/30 transition hover:scale-[1.02] hover:shadow-xl'>
								Submit a complaint
								<ArrowRight className='h-5 w-5' />
							</Link>
							<Link href='/auth/login' className='inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-8 py-5 text-lg font-semibold text-slate-800 shadow-sm transition hover:border-[#1ca5e4]/30 hover:bg-slate-50'>
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
							<Link href='/customer' className='inline-flex items-center gap-2 rounded-xl bg-[#1ca5e4] px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-[#1ca5e4]/40 transition hover:bg-[#1693cd] hover:shadow-xl'>
								Book now
								<ArrowRight className='h-5 w-5' />
							</Link>
							<Link href='tel:+971XXXXXXXX' className='inline-flex items-center gap-2 rounded-xl border-2 border-white/20 bg-white/10 px-8 py-4 text-lg font-semibold text-white backdrop-blur-sm transition hover:bg-white/20'>
								<Phone className='h-5 w-5' />
								Call +971 XX XXX XXXX
							</Link>
						</div>
					</div>
				</section>

				{/* Footer */}
				<footer className='border-t border-slate-200 pt-8 text-center text-sm text-slate-600'>
					<p>&copy; {new Date().getFullYear()} Fahad Al Sharq AC Systems LLC. All rights reserved.</p>
					<p className='mt-2'>Licensed AC contractor serving all Emirates</p>
				</footer>
			</div>
		</div>
	);
}
