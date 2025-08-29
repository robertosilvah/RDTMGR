import React, { useState } from "react";
import { HashRouter, Switch, Route, Link } from "react-router-dom";

import { TopAppBar, TopAppBarRow, TopAppBarSection, TopAppBarNavigationIcon, TopAppBarTitle, TopAppBarActionItem, TopAppBarFixedAdjust, List, ListItem, CollapsibleList, SimpleListItem, ListItemGraphic, Drawer, DrawerHeader, DrawerTitle, DrawerSubtitle, DrawerContent, DrawerAppContent, Portal } from "rmwc";

import "rmwc/dist/styles";
import "./App.scss";

import { AppContextProvider, LineProcessesProvider } from "./Context";
import { Report } from "./pages/Report";
import { ReportTemplates } from "./pages/ReportTemplates";
import { Dashboard } from "./pages/Dashboard";
import { Settings } from "./pages/Settings";

const menuItems = [
	{
		icon: "dashboard",
		name: "Dashboard",
		path: "/",
		component: Dashboard
	},
	{
		icon: "description",
		name: "Reports",
		path: "/reports",
		component: Report
	},
	{
		name: "Tools",
		items: [
			{
				icon: "settings",
				name: "Settings",
				path: "/settings",
				component: Settings
			},
		]
	},
	// {
	// 	name: "Templates",
	// 	path: "/templates",
	// 	component: ReportTemplates
	// }
];

const flattenMenuItems = (menuItems) => {
	const flattened = [];

	menuItems.forEach(i => {
		if (i.items)
			flattenMenuItems(i.items).forEach(u => flattened.push(u));
		else
			flattened.push(i);
	});

	return flattened;
}

const App = (): JSX.Element => {
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");

	return (
		<AppContextProvider>
			<LineProcessesProvider>
				<TopAppBar dense>
					<TopAppBarRow>
						<TopAppBarSection alignStart>
							<TopAppBarNavigationIcon icon="menu" onClick={() => setOpen(v => !v)}/>
							<TopAppBarTitle>RDT {title ? `| ${title}` : null}</TopAppBarTitle>
						</TopAppBarSection>
					</TopAppBarRow>
				</TopAppBar>
				<TopAppBarFixedAdjust style={{ paddingTop: "48px" }}/>

				<div className="main">
					<HashRouter>
						<Drawer id="main" dismissible open={open}>
							{/* <DrawerHeader>
								<DrawerTitle>DrawerHeader</DrawerTitle>
								<DrawerSubtitle>Subtitle</DrawerSubtitle>
							</DrawerHeader> */}

							<DrawerContent>
								<List>
									{
										menuItems.map(i =>
											<CollapsibleListItem key={i.name} {...i} onClick={({value}) => {
												//console.log(value);
												setTitle(value)
											}}/>)
									}
								</List>
							</DrawerContent>
						</Drawer>

						<DrawerAppContent id="content">
							<Switch>
								{
									flattenMenuItems(menuItems).map(i =>
										<Route key={i.name} path={i.path} component={i.component} exact={true}/>
									)
								}
							</Switch>
						</DrawerAppContent>
					</HashRouter>
				</div>
				
				<Portal/>
			</LineProcessesProvider>
		</AppContextProvider>
	);
}

const CollapsibleListItem = ({name, path = null, items = null, icon = null, onClick = null}) => {
	if (items && Array.isArray(items)) {
		return (
			<CollapsibleList
				key={name}
				handle={
					<SimpleListItem
						text={name}
						metaIcon="chevron_right"
					/>
				}
			>
				{
					items.map(u =>
						<CollapsibleListItem key={u.name} name={u.name} path={u.path} icon={u.icon}/>
					)
				}
			</CollapsibleList>
		)
	}

	return (
		<ListItem key={name} tag={Link} to={path}
			onClick={() => onClick ? onClick({value: name}) : undefined}
		>
			{icon && <ListItemGraphic icon={icon}/>}
			{name}
		</ListItem>
	);
}

export default App;
