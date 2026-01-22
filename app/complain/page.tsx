import Navbar from "./components/Navbar";
import ComplaintForm from "./components/ComplaintForm";

export default function Home() {
	return (
		<div className='min-h-screen bg-gradient-to-l from-blue-50 via-blue-100 to-blue-50'>
			<Navbar />
			<ComplaintForm />
		</div>
	);
}
