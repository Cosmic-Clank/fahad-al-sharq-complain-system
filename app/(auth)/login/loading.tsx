import { Loading } from "@/components/ui/loading";
import React from "react";

function loading() {
	return (
		<div className='w-full h-full flex items-center justify-center'>
			<Loading className='text-primary' text='Fetching Details...' />
		</div>
	);
}

export default loading;
