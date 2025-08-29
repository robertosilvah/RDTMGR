import React, { useCallback, useContext, useEffect, useRef, useState } from "react";

import moment from "moment";

import { DataTable, DataTableContent, DataTableHead, DataTableRow, DataTableHeadCell, DataTableBody, DataTableCell, Checkbox, Select, IconButton, TextField } from "rmwc";

import { fetchConfig, getTimeFromDate, timeAsDate } from "../Helpers";
import { AppContext } from "../Context";

import "./Settings.scss";

const endpoints = ["locations", "shifts/definitions", "products", "production/standards"];

export const Settings = () => {
	const {api} = useContext(AppContext);
	const [checked, setChecked] = useState({});
	const [inEdition, setInEdition] = useState({});

	const [endpoint, setEndpoint] = useState("locations");

	const [data, setData] = useState([]);
	const [fields, setFields] = useState({});

	const tableBody = useRef(null);

	// fetch locations and locations table fields
	useEffect(() => {
		fetch(`${api.main}/${endpoint}`, {...fetchConfig, method: "GET"})
			.then(response => response.json())
			.then(data => {
				// console.log(data);
				setData(data);
			})
			.catch(reason => console.log(reason));

		fetch(`${api.main}/${endpoint}/fields`, {...fetchConfig, method: "GET"})
			.then(response => response.json())
			.then(fields => {
				// console.log(fields);
				setFields(fields);
			})
			.catch(reason => console.log(reason));
	}, [api, endpoint]);

	const [moreData, setMoreData] = useState({});

	// fetch relationship tables
	useEffect(() => {
		Object.keys(fields).forEach(name => {
			const field = fields[name];
			const {relationship} = field;

			if (relationship) {
				const {endpoint} = relationship;

				fetch(`${api.main}/${endpoint}`, {...fetchConfig, method: "GET"})
					.then(response => response.json())
					.then(result => {
						setMoreData(prev => {
							const state = {...prev};
							state[endpoint] = result;
							return state;
						});
					})
					.catch(reason => console.log(reason));
			}
		})
	}, [api, fields, data]);

	const saveModel = useCallback(i => {
		setFields(fields => {
			const model = {...inEdition[i]};
			const {isNew} = model;

			if (isNew)
				delete model.id;

			delete model.isNew;

			const body = JSON.stringify(model);
			console.log(inEdition, i, model);

			setEndpoint(endpoint => {
				const init: RequestInit = {
					...fetchConfig,
					method: isNew ? "POST" : "PUT",
					body
				};

				fetch(`${api.main}/${endpoint}`, init)
					.then(response => {
						if (response.ok)
							return response.json();
						
						throw new Error(response.statusText);
					})
					.then(result => {
						console.log(result);
						
						setInEdition(prev => {
							const state = {...prev};
							state[i] = null;
							return state;
						});

						setData(prev => {
							const state = [...prev];
							state[i] = result;
							return state;
						})
					})
					.catch(reason => console.log(reason));

				return endpoint;
			});

			return fields;
		});
	}, [api, inEdition]);

	const addModel = useCallback(() => {
		setFields(fields => {
			setData(prev => {
				const data = [...prev];

				const obj = {isNew: true};

				Object.keys(fields).forEach((name) => {
					obj[name] = fields[name].default;
				})

				console.log(obj);
				data.push(obj);

				setInEdition(prev => {
					const inEdition = {...prev};
					inEdition[data.length - 1] = obj;

					return inEdition;
				})

				return data;
			})

			return fields;
		})
	}, []);

	// scroll to bottom when new row added
	useEffect(() => {
		setData(data => {
			if (data.length > 0 && inEdition[data.length - 1] && inEdition[data.length - 1].isNew) {
				tableBody.current.scrollTop = tableBody.current.scrollHeight;
				tableBody.current.scrollLeft = tableBody.current.scrollWidth;
			} else {
				data.every(v => {
					if (v) {
						tableBody.current.scrollLeft = tableBody.current.scrollWidth;
						return false;
					}

					return true;
				});
			}

			return data;
		});
	}, [inEdition]);

	return (<div className="settings-page">
		<div style={{display: "flex", alignItems: "center", height: "56px"}}>
			<div>
				<Select
					className="dense"
					outlined
					options={endpoints}
					value={endpoint}
					onChange={({currentTarget}) => setEndpoint(currentTarget.value)}
				/>
			</div>

			<div className="end">
				<IconButton icon="add" label="Add row" onClick={addModel}/>
			</div>
		</div>

		<DataTable
			stickyRows={1}
			className="table"
			ref={tableBody}
		>
			<DataTableContent>
				<DataTableHead>
					<DataTableRow>
						<DataTableHeadCell hasFormControl style={{width: "56px"}}>
							<Checkbox />
						</DataTableHeadCell>
						{
							Object.keys(fields).map(name =>
								<DataTableHeadCell key={name}>{name}</DataTableHeadCell>)
						}

						<DataTableHeadCell style={{width: 0, textAlign: "end"}}>
							Options
						</DataTableHeadCell>
					</DataTableRow>
				</DataTableHead>

				<DataTableBody>
					{
						data.map((v, i) => (
							<DataTableRow key={i} selected={checked[i]}>
								<DataTableCell hasFormControl>
									<Checkbox
										checked={!!checked[i]}
										onChange={evt => {
											checked[i] = evt.currentTarget.checked;
											setChecked({ ...checked });
										}}
									/>
								</DataTableCell>

								{
									Object.keys(fields).map(fieldName => {
										const field = fields[fieldName];

										if (!inEdition[i]) {
											if (field.relationship) {
												return <DataTableCell key={fieldName}>
													{
														(
															moreData[field.relationship.endpoint] && v[fieldName] &&
															(
																moreData[field.relationship.endpoint].filter(d => d.id === v[fieldName])[0]['name'] ||
																moreData[field.relationship.endpoint].filter(d => d.id === v[fieldName])[0]['description'] ||
																Object.values(moreData[field.relationship.endpoint].filter(d => d.id === v[fieldName])[0]).map(v => String(v)).join(" - ")
															)
														) || "-"
													}
												</DataTableCell>;
											} else switch(field.type) {
												case "boolean":
													return <DataTableCell key={fieldName + v[fieldName]}>
														<Checkbox disabled defaultChecked={v[fieldName]}/>
													</DataTableCell>;
												case "datetime":
												case "timestamp":
													return <DataTableCell key={fieldName + v[fieldName]}>
														{new Date(v[fieldName]).toLocaleString()}
													</DataTableCell>;
												case "time":
													return <DataTableCell key={fieldName + v[fieldName]}>
														{getTimeFromDate(v[fieldName])}
													</DataTableCell>;
												default:
													return <DataTableCell key={fieldName}>{String(v[fieldName])}</DataTableCell>;
											}
										} else if (field.relationship) {
											return <DataTableCell key={fieldName}>
												<Select
													// placeholder={value}
													value={String(inEdition[i][fieldName])}
													onChange={(e) => {
														const edited = {...inEdition[i]};
														edited[fieldName] = e.currentTarget.value;

														setInEdition(prev => {
															const state = {...prev};
															state[i] = edited;
															return state;
														})
													}}
												>
													<option value="null">Empty</option>

													{
														moreData[field.relationship.endpoint] &&
														moreData[field.relationship.endpoint].map(item => {
															const asd = item["name"] || item["description"] || Object.values(item).filter(v).map(v => String(v)).join(" - ");
															return <option key={item.id} value={item.id}>{asd}</option>;
														})
													}
												</Select>
											</DataTableCell>;
										} else switch(field.type) {
											case "string":
												return <DataTableCell key={fieldName}>
													<TextField
														placeholder={fieldName}
														value={inEdition[i][fieldName] || ""}
														maxLength={field.length}
														onChange={(e) => {
															const edited = {...inEdition[i]};
															edited[fieldName] = e.currentTarget.value;

															setInEdition(prev => {
																const state = {...prev};
																state[i] = edited;
																return state;
															})
														}}
													/>
												</DataTableCell>;

											case "integer":
											case "float":
												return <DataTableCell key={fieldName}>
													<TextField
														placeholder={fieldName}
														type="number"
														value={inEdition[i][fieldName] || ""}
														maxLength={field.length}
														onChange={(e) => {
															const edited = {...inEdition[i]};
															edited[fieldName] = Number(e.currentTarget.value);

															setInEdition(prev => {
																const state = {...prev};
																state[i] = edited;
																return state;
															})
														}}
													/>
												</DataTableCell>;

											case "datetime":
											case "timestamp": {
												const datetime = new Date(inEdition[i][fieldName]);

												return <DataTableCell key={fieldName}>
													<div className="datetime-cell">
														<TextField
															label="date"
															type="date"
															value={datetime ? moment(datetime).format("YYYY-MM-DD") : ""}
															onChange={({currentTarget}) => {
																const edited = {...inEdition[i]};
																
																const date = datetime || new Date();
																const {value: valueStr} = currentTarget;

																if (valueStr) {
																	const value = valueStr.split("-");
																	const [year, month, day] = value.map(v => Number(v));
																	date.setFullYear(year, month - 1, day);
																	edited[fieldName] = date;

																	console.log(value, date);

																	setInEdition(prev => {
																		const state = {...prev};
																		state[i] = edited;
																		return state;
																	})
																} else {
																	edited[fieldName] = null;

																	setInEdition(prev => {
																		const state = {...prev};
																		state[i] = edited;
																		return state;
																	})
																}
															}}
														/>
														<TextField
															label="time"
															type="time"
															value={datetime ? moment(datetime).format("HH:mm:ss") : ""}
															onChange={({currentTarget}) => {
																const edited = {...inEdition[i]};
																
																const date = datetime || new Date();
																const {value: valueStr} = currentTarget;

																console.log(valueStr);

																if (valueStr) {
																	const value = valueStr.split(":");
																	const [hours, min, sec] = value.map(v => Number(v));
																	// date.setFullYear(year, month - 1, day);
																	date.setHours(hours, min, sec, 0);
																	edited[fieldName] = date;

																	console.log(value, date);

																	setInEdition(prev => {
																		const state = {...prev};
																		state[i] = edited;
																		return state;
																	})
																} else {
																	edited[fieldName] = null;

																	setInEdition(prev => {
																		const state = {...prev};
																		state[i] = edited;
																		return state;
																	})
																}
															}}
														/>
													</div>
												</DataTableCell>;
											}

											case "time": {
												return <DataTableCell key={fieldName}>
													<div className="datetime-cell">
														<TextField
															label="time"
															type="time"
															value={getTimeFromDate(inEdition[i][fieldName] || 0)}
															onChange={({currentTarget}) => {
																const edited = { ...inEdition[i] };
																const { value: valueStr } = currentTarget;

																if (valueStr) {
																	const value = timeAsDate(valueStr);
																	edited[fieldName] = value;
																	console.log(valueStr, value);

																	setInEdition(prev => {
																		const state = {...prev};
																		state[i] = edited;
																		return state;
																	})
																} else {
																	edited[fieldName] = "00:00";

																	setInEdition(prev => {
																		const state = {...prev};
																		state[i] = edited;
																		return state;
																	})
																}
															}}
														/>
													</div>
												</DataTableCell>;
											}

											case "boolean":
												return <DataTableCell key={fieldName + i}>
													<Checkbox
														checked={inEdition[i][fieldName]}
														onChange={e => {
															const edited = {...inEdition[i]};
															edited[fieldName] = e.currentTarget.checked;

															setInEdition(prev => {
																const state = {...prev};
																state[i] = edited;
																return state;
															})
														}}
													/>
												</DataTableCell>;
											default:
												return <DataTableCell key={fieldName}>{String(v[fieldName])}</DataTableCell>;
										}
									})
								}

								<DataTableCell style={{textAlign: "end"}}>
									{
										(!inEdition[i] &&
										<IconButton icon="edit" label="Edit" onClick={() => {
											setInEdition(prev => {
												const inEdition = {...prev};
												inEdition[i] = {...v};
												return inEdition;
											});
										}}/>) ||
										<div style={{display: "flex", flexDirection: "row"}}>
											<IconButton icon="clear" label="Cancel" onClick={() => {
												setInEdition(prev => {
													const inEdition = {...prev};
													inEdition[i] = null;
													return inEdition;
												});

												if (v.isNew) {
													setData(prev => {
														const state = [...prev];
														state.splice(i);
														return state;
													});
												}
											}}/>

											<IconButton icon="done" label="Done" onClick={() => saveModel(i)}/>
										</div>
									}
								</DataTableCell>
							</DataTableRow>
						))
					}
				</DataTableBody>
			</DataTableContent>
		</DataTable>
	</div>);
}
