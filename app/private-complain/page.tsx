import Navbar from "./components/Navbar";
import ComplaintForm from "./components/ComplaintForm";

export default function Home() {
	return (
		<div className='min-h-screen bg-gradient-to-l from-orange-50 via-orange-100 to-orange-50'>
			<Navbar />
			<ComplaintForm />
		</div>
	);
}
