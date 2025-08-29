import React, { useContext } from "react";

export const FullscreenSpinner = ({loading = false}) =>
	loading ? <div className="spinner"/> : null;
