import React, { useState, useEffect, CSSProperties, MouseEventHandler, ReactNode } from "react";
import { calcLuminance } from "../../Helpers";
import "../Components.scss";
import { ReactComponent as FooterIcon } from "../../assets/arrow-right-circle.svg";

const Themes: {[key: string]: CSSProperties} = {
	Light: {
		color: "rgba(0, 0, 0, .87)",
		opacity: .24
	},
	Dark: {
		color: "white",
		opacity: .38
	}
}

export interface IndicatorCardProps {
	title?;
	subtitle?;
	background?;
	icon?;
	onClick?;
	onClickOptions?: {handle: MouseEventHandler<HTMLDivElement>, content: ReactNode};
}

export const IndicatorCard = ({title, subtitle, background, icon, onClick, onClickOptions}: IndicatorCardProps) => {
	const [luminance, setLuminance] = useState<number>();
	const [theme, setTheme] = useState(Themes.Light);

	useEffect(() => setLuminance(calcLuminance(background)), [background]);

	useEffect(() => setTheme(() => {
		const theme = luminance > 0.5 ? { ...Themes.Light } : { ...Themes.Dark };

		if (icon) {
			theme.maskImage = `url(${process.env.PUBLIC_URL}/assets/${icon}.svg)`;
			theme.WebkitMaskImage = theme.maskImage;
		}

		return theme;
	}), [luminance, icon]);

	return (
		<div
			className="indicator-card"
			style={{ color: theme.color, background }}
		>
			<div className="content">
				<div className="background" style={theme}></div>
				<span className="title">
					{title}
				</span>

				<span className="subtitle">
					{subtitle}
				</span>
			</div>

			{
				(onClick &&
				<div className="footer" onClick={onClick}>
					More info
					<FooterIcon/>
				</div>) ||
				(onClickOptions &&
					<div className="footer" onClick={onClickOptions.handle}>
						{onClickOptions.content}
						<FooterIcon/>
					</div>)
			}
		</div>
	)
}
