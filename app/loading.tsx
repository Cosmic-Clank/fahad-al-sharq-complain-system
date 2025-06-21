import { Loading } from "@/components/ui/loading";
import React from "react";

function loading() {
	return (
		<div className='w-screen h-screen flex justify-center items-center'>
			<Loading />
		</div>
	);
}

export default loading;
