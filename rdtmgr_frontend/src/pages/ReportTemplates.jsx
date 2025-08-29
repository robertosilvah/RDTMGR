import React, { useState, useCallback, Fragment } from "react";

import { Button, Card, Typography, TextField, Select, Drawer, DrawerHeader, DrawerTitle, DrawerSubtitle, DrawerContent, DrawerAppContent, TopAppBar, TopAppBarRow, TopAppBarSection, TopAppBarTitle, TopAppBarActionItem } from "rmwc";


const TestContent = () => {
	return <>
		TestContent is an optional component that will resize
		content when the dismissible drawer is open and closed. It
		must be placed directly after the Drawer component.
	</>;
}

const TestContentAlt = () => <>
	TestContentAlt is an optional component that will resize
	content when the dismissible drawer is open and closed. It
	must be placed directly after the Drawer component.
</>;

const options = {
		TestContent: TestContent,
		TestContentAlt: TestContentAlt,
		Button: Button,
}

export const ReportTemplates = () => {
	const [rows] = useState(["1fr", "1fr", "1fr", "1fr"]);
	const [columns] = useState(["1fr", "1fr", "1fr", "1fr"]);

	const [areas, setAreas] = useState([]);

	const [, setSelection] = useState([]);

	const [selectedArea, setSelectedArea] = useState();

	const editArea = useCallback((area, i) => {
		console.log("setSelectedArea", area, i);

		setSelectedArea(prev => {
			if (!area) {
				setOpen(false);
				return null;
			}

			if (prev && prev.index === i) {
				setOpen(o => !o);
				return prev;
			} else {
				console.log("setOpen(true)");
				setOpen(true);
				return { ...area, index: i };
			}
		});
	}, []);

	const select = useCallback((x, y) => {
		console.log(`(${x};${y})`);

		// setSelection({ x, y });
		setSelection(prev => {
			prev.push({ x, y });

			if (prev.length === 2) {
				let { x: x0, y: y0 } = prev[0];
				let { x: x1, y: y1 } = prev[1];

				if (x1 < x0 || x0 > x1)
					[x0, x1] = [x1, x0];
				if (y1 < y0 || y0 > y1)
					[y0, y1] = [y1, y0];

				console.log({ x0, y0, x1, y1 });

				setAreas(prev => {
					const column = x0 + 1;
					const row = y0 + 1;
					const columnSpan = x1 - x0 + 1;
					const rowSpan = y1 - y0 + 1;

					const area = { name: "", column, row, columnSpan, rowSpan };

					const areas = [...prev, area];

					console.log("add new area", areas);
					editArea(area, areas.length - 1);
					return areas;
				});

				return [];
			}

			return [...prev];
		});
	}, [editArea]);

	const saveArea = useCallback(i => {
		setSelectedArea(area => {
			setAreas(prev => {
				const areas = [...prev];
				areas[i] = area;
				console.log(area, prev, areas);
				return areas;
			});

			return null;
		});
	}, []);

	const [open, setOpen] = useState(false);

	return (<>
		<Drawer id="asd" dismissible open={open} style={{ zIndex: 4 }}>
			{
				selectedArea && <>
					<DrawerHeader dir="ltr">
						<DrawerTitle>{selectedArea.name || `Unnamed (${selectedArea.index})`}</DrawerTitle>
						<DrawerSubtitle>{selectedArea.component?.name || "Empty"}</DrawerSubtitle>
					</DrawerHeader>

					<DrawerContent dir="ltr" style={{
						display: "flex",
						flexDirection: "column",
						padding: "8px 16px",
						gap: "8px"
					}}>
						<TextField
							label="Area name"
							value={selectedArea.name}
							style={{ width: "100%" }}
							onChange={({target}) => setSelectedArea(p => { return { ...p, name: target.value }; })}
						/>

						<Select
							label="Component"
							options={Object.keys(options)}
							onChange={({target}) => setSelectedArea(p => { return { ...p, component: options[target.value]} })}
						/>
					</DrawerContent>
				</>
			}
		</Drawer>

		<DrawerAppContent id="content">
			<div
				id="editor"
				style={{
					position: "absolute",
					display: "grid",
					background: null,
					gridTemplateColumns: columns.join(" "),
					gridTemplateRows: rows.join(" "),
					gap: "8px",
					height: "calc(100% - 32px)",
					width: "calc(100% - 32px)",
					padding: "16px"
				}}
				dir="ltr"
			>
				{
					rows.map((h, y) =>
						<Fragment key={`${y}-${h}`}>
							{
								columns.map((w, x) => (
									<Fragment key={`${x}-${w}`}>
										<Button outlined
											style={{ height: "100%", minWidth: "0" }}
											onClick={() => select(x, y)}
										>
											({x};{y})
										</Button>
									</Fragment>
								))
							}
						</Fragment>
					)
				}
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: columns.join(" "),
					gridTemplateRows: rows.join(" "),
					gap: "8px",
					height: "calc(100% - 32px)",
					padding: "16px"
				}}
				dir="ltr"
			>
				{
					areas.map((area, i) => {
						const {name, column, columnSpan, row, rowSpan, component: Component, showToolbar} = area;

						return (
							<Card
								key={`${column}+${row}`}
								outlined
								style={{
									height: "100%",
									minWidth: "0",
									gridColumn: `${column} / span ${columnSpan}`,
									gridRow: `${row} / span ${rowSpan}`,
									overflow: "auto"
								}}
							>
								<div className="card-content" style={{ height: "100%", overflow: "auto" }}>
									{
										showToolbar &&
										<Typography use="headline6" tag="h2" style={{ paddingLeft: "16px", paddingRight: "16px" }}>
											{name}
										</Typography>
									}
	
									<TopAppBar dense className="component-toolbar">
										<TopAppBarRow>
											<TopAppBarSection>
												<TopAppBarTitle style={{ paddingLeft: "12px", paddingRight: "0px" }}>
													{name || `Unnamed (${i})`}
												</TopAppBarTitle>
											</TopAppBarSection>
	
											<TopAppBarSection alignEnd>
												{
													selectedArea && selectedArea.index === i ?
														<>
															<TopAppBarActionItem icon="close" onClick={() => editArea(null)}/>
															<TopAppBarActionItem icon="done" onClick={() => saveArea(i)}/>
														</> :
														<TopAppBarActionItem icon="settings" onClick={() => editArea(area, i)}/>
												}
											</TopAppBarSection>
										</TopAppBarRow>
									</TopAppBar>
									
									{
										Component ?
											<Component/> :
											<div style={{ padding: "16px" }}>
												<Typography use="subtitle1">
													This card is not configured yet
												</Typography>
											</div>
									}
								</div>
							</Card>
						);
					})
				}
			</div>
		</DrawerAppContent>
	</>);
}

// const SizerHorizontal = (w) => {
// 	return (
// 		<Button className="sizer horizontal">
// 			<div>
// 				<span className="material-icons">chevron_left</span>
// 				{w}
// 				<span className="material-icons">chevron_right</span>
// 			</div>
// 		</Button>
// 	);
// }

// const SizerVertical = (h) => {
// 	return (
// 		<Button className="sizer vertical">
// 			<div>
// 				<span className="material-icons">expand_less</span>
// 				{h}
// 				<span className="material-icons">expand_more</span>
// 			</div>
// 		</Button>
// 	);
// }