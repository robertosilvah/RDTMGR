import React, { useState, useContext, useEffect } from "react";

import { TextField } from "rmwc";

import { FilterContext } from "../../Context";

export const SearchInput = () => {
	const filters = useContext(FilterContext);
	const [search, setState] = useState("");

	useEffect(() => {
		setState(() => {
			if (filters && filters.search)
				return filters.search;
		})
	}, [filters, filters.search])

	return (<>
		<TextField
			outlined
			placeholder="Search..."
			value={search ? search : ""}
			onChange={({target}) => setState(target.value)}
			style={{width: "128px", height: "36px"}}
			trailingIcon={{
				icon: "search",
				tabIndex: 0,
				onClick: () => console.log("Clear")
			}}
		/>
	</>);
}