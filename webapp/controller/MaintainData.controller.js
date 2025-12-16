// sap.ui.define([
//     "./BaseController",
//     "sap/m/MessageBox",
//     "sap/ui/export/Spreadsheet",
//     "sap/m/MessageToast",
//     "sap/ui/unified/FileUploader",
//     "sap/ui/model/json/JSONModel",
//     "../utils/validation",
//     "sap/ui/layout/form/FormContainer",
//     "sap/ui/layout/form/FormElement"
// ], function (BaseController, MessageBox, Spreadsheet, MessageToast, FileUploader, JSONModel, utils, FormContainer, FormElement) {
//     "use strict";
//     return BaseController.extend("sap.ui.com.project1.controller.MaintainData", {

//         onInit: function () {
//             this.getOwnerComponent().getRouter().getRoute("RouteMaintainData").attachMatched(this._onRouteMatched, this);
//         },

//         _onRouteMatched: async function () {
//             const omodel = new sap.ui.model.json.JSONModel({
//                 url: "https://rest.kalpavrikshatechnologies.com/",
//                 headers: {
//                     name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
//                     password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
//                     "Content-Type": "application/json",
//                 },
//                 isRadioVisible: false,
//             });
//             this.getOwnerComponent().setModel(omodel, "LoginModel");
//             this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
//              this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

//             const oMDmodel = new sap.ui.model.json.JSONModel({
//                 BranchID: "",
//                 Name: "",
//                 Address: "",
//                 Pincode: "",
//                 Contact: ""
//             });
//             this.getView().setModel(oMDmodel, "MDmodel");
//             var oeditable = new sap.ui.model.json.JSONModel({
//                 isEdit: false
//             });
//             this.getView().setModel(oeditable, "editableModel");
//             this.Onsearch();

//             // this.getView().setModel(new JSONModel([]), "dataModel");
//             // this.getView().setModel(new JSONModel({}), "MDmodel");

//             // var aEntities = [
//             //     { Entity: "HM_Branch", DisplayName: "Branch", unikey: "BranchID" },
//             //     { Entity: "HM_HostelFeatures", DisplayName: "Hostel Features", unikey: "ID" }
//             // ];
//             // this.getView().setModel(new JSONModel(aEntities), "EntityModel");

//             // this._fetchCommonData("Country", "CountryModel", "");
//             // this._fetchCommonData("State", "StateModel");
//             // this._fetchCommonData("City", "CityModel");
//             // this.getView().setModel(new JSONModel([]), "FilteredStateModel");
//             // this.getView().setModel(new JSONModel([]), "FilteredCityModel");
//             // this.onEntitySelect(null, "Branch");
//         },

//          Onsearch: function () {
//             sap.ui.core.BusyIndicator.show(0);
//             this.ajaxReadWithJQuery("HM_Branch", "").then((oData) => {
//                 var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
//                 var model = new sap.ui.model.json.JSONModel(oFCIAerData);
//                 this.getView().setModel(model, "mainModel")
//                 sap.ui.core.BusyIndicator.hide();
//             })
//         },

//          MD_onPressClear: function () {
//             this.getView().byId("MD_id_BranchCode").setSelectedKey("")
//             this.getView().byId("MD_id_Pincode").setSelectedKey("")
//         },

//          MD_onSearch: function () {
//             var oView = this.getView();
//             var oTable = oView.byId("id_MD_Table");
//             var oBinding = oTable.getBinding("items");

//             var sCustomerName = oView.byId("MD_id_BranchCode").getSelectedKey() || oView.byId("MD_id_BranchCode").getValue();
//             var sCustomerID = oView.byId("MD_id_Pincode").getSelectedKey() || oView.byId("MD_id_Pincode").getValue();

//             var aFilters = [];
//             if (sCustomerName) {
//                 aFilters.push(new sap.ui.model.Filter("BranchID", sap.ui.model.FilterOperator.Contains, sCustomerName));
//             }

//             if (sCustomerID) {
//                 aFilters.push(new sap.ui.model.Filter("Pincode", sap.ui.model.FilterOperator.Contains, sCustomerID));
//             }

//             var oCombinedFilter = new sap.ui.model.Filter({
//                 filters: aFilters,
//                 and: true
//             });

//             oBinding.filter(oCombinedFilter);
//         },

//         // onEntitySelect: async function (oEvent, entity) {
//         //     sap.ui.core.BusyIndicator.show(0);
//         //     var that = this;
//         //     var name;
//         //     if (oEvent && oEvent.getParameter && oEvent.getParameter("listItem")) {
//         //         name = oEvent.getParameter("listItem").getTitle();
//         //     } else {
//         //         name = entity;
//         //     }

//         //     this.sTitle = this.getView().getModel("EntityModel").getData().filter(e => e.DisplayName === name)[0].Entity;
//         //     var oDetailContainer = this.byId("detailContainer");
//         //     if (oDetailContainer && oDetailContainer.removeAllItems) {
//         //         oDetailContainer.removeAllItems();
//         //     } else {
//         //         while (oDetailContainer.getItems && oDetailContainer.getItems().length) {
//         //             oDetailContainer.removeItem(oDetailContainer.getItems()[0]);
//         //         }
//         //     }
//         //     let data = await this.ajaxReadWithJQuery(this.sTitle, "");
//         //     let BmodelData = (data && data.data) ? data.data : [];
//         //     sap.ui.core.BusyIndicator.hide();
//         //     this.getView().setModel(new JSONModel(BmodelData), "dataModel");
//         //     var sampleRow = BmodelData[0];
//         //     if (!sampleRow && this.sTitle === "HM_HostelFeatures") {
//         //         sampleRow = {
//         //             FacilityName: "",
//         //             Description: "",
//         //             Photo1: "",
//         //             Photo1Name: "",
//         //             Photo1Type: "",
//         //             Photo2: "",
//         //             Photo2Name: "",
//         //             Photo2Type: ""
//         //         };
//         //     }

//         //     this.oTable = new sap.m.Table({
//         //         inset: false,
//         //         growing: true,
//         //         growingScrollToLoad: true,
//         //         mode: sap.m.ListMode.SingleSelectLeft,
//         //         sticky: ["ColumnHeaders"],
//         //         autoPopinMode: true,
//         //         demandPopin: true,
//         //         fitContainer: true,
//         //         width: "100%",
//         //     });

//         //     let aFields = sampleRow ? Object.keys(sampleRow) : [];
//         //     if (this.sTitle === "HM_HostelFeatures") {
//         //         aFields = aFields.filter(f => {
//         //             const L = f.toLowerCase();
//         //             return !(L.includes("hoto1name") || L.includes("photo1type") || L.includes("photo2name") || L.includes("photo2type"));
//         //         });
//         //     }

//         //     aFields.forEach(function (sField) {
//         //         that.oTable.addColumn(new sap.m.Column({
//         //             header: new sap.m.Label({ text: sField.toUpperCase() })
//         //         }));
//         //     });

//         //     var aCells = [];
//         //     aFields.forEach(function (sField) {
//         //         if (sField === "Photo1" || sField === "Photo2") {
//         //             aCells.push(new sap.m.Link({
//         //                 text: "View",
//         //                 visible: "{= ${dataModel>" + sField + "} ? true : false }",
//         //                 press: function () {
//         //                     let imgBase64 = this.getBindingContext("dataModel").getProperty(sField);
//         //                     that._openImagePopup(imgBase64);
//         //                 }
//         //             }));
//         //         } else {
//         //             aCells.push(new sap.m.Text({ text: "{dataModel>" + sField + "}" }));
//         //         }
//         //     });

//         //     var oTemplate = new sap.m.ColumnListItem({ cells: aCells });
//         //     this.oTable.bindItems({ path: "dataModel>/", template: oTemplate });
//         //     oDetailContainer.addItem(this.oTable);
//         // },

//         // MD_onAddButtonPress: function (oData, flag) {
//         //     let oView = this.getView();
//         //     let isEdit = !!flag;
//         //     this.oPayload = isEdit ? oData : null;

//         //     this._imageData = {
//         //         img1: null, img1name: null, img1type: null,
//         //         img2: null, img2name: null, img2type: null
//         //     };

//         //     if (!this.oUpdatePass) {
//         //         sap.ui.core.Fragment.load({
//         //             name: "sap.ui.com.project1.fragment.MaintainData",
//         //             controller: this,
//         //         }).then(function (oFrag) {
//         //             this.oUpdatePass = oFrag;
//         //             oView.addDependent(this.oUpdatePass);

//         //             this._openAddOrEdit(flag);
//         //         }.bind(this));
//         //     } else {
//         //         this._openAddOrEdit(flag);
//         //     }
//         // },

//         // _openAddOrEdit: function (isEdit) {
//         //     if (!isEdit) {
//         //         this.oUpdatePass.setModel(new JSONModel({
//         //             FacilityName: "",
//         //             Description: "",
//         //             Photo1: null,
//         //             Photo1Name: null,
//         //             Photo1Type: null,
//         //             Photo2: null,
//         //             Photo2Name: null,
//         //             Photo2Type: null
//         //         }), "formModel");
//         //     } else {
//         //         this.oUpdatePass.setModel(new JSONModel(this.oPayload), "formModel");
//         //     }
//         //     let u1 = sap.ui.getCore().byId("imageUpload1");
//         //     let u2 = sap.ui.getCore().byId("imageUpload2");
//         //     if (u1) try { u1.setValue(""); } catch (e) { }
//         //     if (u2) try { u2.setValue(""); } catch (e) { }

//         //     this.oUpdatePass.open();
//         //     this.commonFragmentButtonsHandle(isEdit);
//         //     this.commonFiledInput();
//         // },

//         // MD_onSubmitButtonPress: function () {
//         //     var that = this;
//         //     let formData = this.oUpdatePass.getModel("formModel");
//         //     let myfragmentData = formData.getData();
//         //     let cleanedData = this.normalizeData(myfragmentData);
//         //     if (myfragmentData.countryCode) {
//         //         delete myfragmentData.countryCode;
//         //     }

//         //     if (!cleanedData || Object.keys(cleanedData).length === 0) {
//         //         sap.m.MessageToast.show("Please fill the details");
//         //         return;
//         //     }

//         //     let entityMeta = this.getView().getModel("EntityModel").getData().find(e => e.Entity === this.sTitle);
//         //     let keys = (entityMeta && entityMeta.unikey) ? entityMeta.unikey.split(",") : [];
//         //     if (this.sTitle === "HM_HostelFeatures") {
//         //         keys = keys.filter(k => k !== "ID");
//         //     }

//         //     let missingFields = keys.filter(k => !cleanedData[k] || cleanedData[k].toString().trim() === "");
//         //     if (missingFields.length > 0) {
//         //         sap.m.MessageToast.show("Please fill mandatory Field - " + missingFields.join(", "));
//         //         return;
//         //     }

//         //     if (this.sTitle === "HM_HostelFeatures") {
//         //         cleanedData.Photo1 = this._imageData?.img1 || cleanedData.Photo1 || null;
//         //         cleanedData.Photo1Name = this._imageData?.img1name || cleanedData.Photo1Name || null;
//         //         cleanedData.Photo1Type = this._imageData?.img1type || cleanedData.Photo1Type || null;

//         //         cleanedData.Photo2 = this._imageData?.img2 || cleanedData.Photo2 || null;
//         //         cleanedData.Photo2Name = this._imageData?.img2name || cleanedData.Photo2Name || null;
//         //         cleanedData.Photo2Type = this._imageData?.img2type || cleanedData.Photo2Type || null;

//         //         if (!cleanedData.Photo1) {
//         //             sap.m.MessageToast.show("Please upload Photo 1");
//         //             try { sap.ui.getCore().byId("imageUpload1").focus(); } catch (e) { }
//         //             return;
//         //         }
//         //         if (!cleanedData.Photo2) {
//         //             sap.m.MessageToast.show("Please upload Photo 2");
//         //             try { sap.ui.getCore().byId("imageUpload2").focus(); } catch (e) { }
//         //             return;
//         //         }
//         //     }
//         //     if (this.sTitle === "HM_Branch") {
//         //         if (!utils._LCvalidateMandatoryField({ getSource: () => sap.ui.getCore().byId("MD_Field_BranchID") })) {
//         //             return;
//         //         }
//         //         if (!utils._LCvalidateName({ getSource: () => sap.ui.getCore().byId("MD_Field_Name") })) {
//         //             return;
//         //         }
//         //         if (!utils._LCvalidateMandatoryField({ getSource: () => sap.ui.getCore().byId("MD_Field_Address") })) {
//         //             return;
//         //         }
//         //         if (!utils._LCvalidatePinCode({ getSource: () => sap.ui.getCore().byId("MD_Field_Pincode") })) {
//         //             return;
//         //         }
//         //         if (!utils._LCstrictValidationComboBox({ getSource: () => sap.ui.getCore().byId("MD_Field_Country") })) {
//         //             return;
//         //         }
//         //         if (!utils._LCstrictValidationComboBox({ getSource: () => sap.ui.getCore().byId("MD_Field_State") })) {
//         //             return;
//         //         }
//         //         if (!utils._LCstrictValidationComboBox({ getSource: () => sap.ui.getCore().byId("MD_Field_City") })) {
//         //             return;
//         //         }
//         //         if (!utils._LCvalidateMobileNumber({ getSource: () => sap.ui.getCore().byId("MD_Field_Contact") })) {
//         //             return;
//         //         }
//         //     }

//         //     delete cleanedData.countryCode
//         //     let oPayload = { data: cleanedData };
//         //     sap.ui.core.BusyIndicator.show(0);
//         //     that.ajaxCreateWithJQuery(this.sTitle, oPayload).then(async (res) => {
//         //         that.MD_onCancelButtonPress();
//         //         let oModel = that.getView().getModel("dataModel");
//         //         const tableUpdateData = await that.ajaxReadWithJQuery(that.sTitle, "");
//         //         oModel.setData(tableUpdateData.data);
//         //         sap.ui.core.BusyIndicator.hide();
//         //         sap.m.MessageToast.show("Data saved successfully");
//         //     })
//         //         .catch((err) => {
//         //             sap.ui.core.BusyIndicator.hide();
//         //             if (err && err.responseText) {
//         //                 sap.m.MessageToast.show("Create failed: " + err.responseText);
//         //             } else {
//         //                 sap.m.MessageToast.show("Data already exist");
//         //             }
//         //             that.MD_onCancelButtonPress();
//         //         });
//         //     this.oTable.removeSelections();
//         // },

//         // normalizeData: function (obj) {
//         //     let result = {};
//         //     for (let key in obj) {
//         //         if (Object.hasOwn(obj, key)) {
//         //             let val = obj[key];
//         //             if (typeof val === "string" && val.trim() === "") {
//         //                 result[key] = null;
//         //             } else {
//         //                 result[key] = val;
//         //             }
//         //         }
//         //     }
//         //     return result;
//         // },

//         // commonFragmentButtonsHandle: function (flag) {
//         //     if (flag) {
//         //         sap.ui.getCore().byId("MD_id_saveButoon").setVisible(true);
//         //         sap.ui.getCore().byId("MD_id_submitButoon").setVisible(false);
//         //         this.oUpdatePass.setTitle("Update Record");
//         //     } else {
//         //         sap.ui.getCore().byId("MD_id_saveButoon").setVisible(false);
//         //         sap.ui.getCore().byId("MD_id_submitButoon").setVisible(true);
//         //         this.oUpdatePass.setTitle("Add New Record");
//         //     }
//         // },

//         // MD_onCancelButtonPress: function () {
//         //     if (this.oUpdatePass) { this.oUpdatePass.close(); }
//         //     var oForm = sap.ui.getCore().byId("dynamicForm");
//         //     if (oForm && oForm.removeAllFormContainers) {
//         //         var aRemoved = oForm.removeAllFormContainers();
//         //         if (Array.isArray(aRemoved) && aRemoved.length) {
//         //             aRemoved.forEach(function (oContainer) {
//         //                 try {
//         //                     oContainer.destroy();
//         //                 } catch (e) { }
//         //             });
//         //         }
//         //     }

//         //     this.oTable && this.oTable.removeSelections();
//         //     this._imageData = { img1: null, img2: null, img1name: null, img2name: null, img1type: null, img2type: null };

//         //     var u1 = sap.ui.getCore().byId("imageUpload1");
//         //     var u2 = sap.ui.getCore().byId("imageUpload2");
//         //     if (u1 && u1.setValue) { try { u1.setValue(""); u1.destroy(); } catch (e) { } }
//         //     if (u2 && u2.setValue) { try { u2.setValue(""); u2.destroy(); } catch (e) { } }
//         // },

//         // _removeHostelImage: function (index) {
//         //     try {
//         //         var formModel = this.oUpdatePass.getModel("formModel");
//         //         if (index === 1) {
//         //             this._imageData.img1 = null;
//         //             this._imageData.img1name = null;
//         //             this._imageData.img1type = null;
//         //             formModel.setProperty("/Photo1", null);
//         //             formModel.setProperty("/Photo1Name", null);
//         //             formModel.setProperty("/Photo1Type", null);
//         //         } else {
//         //             this._imageData.img2 = null;
//         //             this._imageData.img2name = null;
//         //             this._imageData.img2type = null;
//         //             formModel.setProperty("/Photo2", null);
//         //             formModel.setProperty("/Photo2Name", null);
//         //             formModel.setProperty("/Photo2Type", null);
//         //         }
//         //         try {
//         //             var up = sap.ui.getCore().byId(index === 1 ? "imageUpload1" : "imageUpload2");
//         //             if (up && up.setValue) up.setValue("");
//         //         } catch (e) { }
//         //     } catch (e) { }
//         // },

//         // commonFiledInput: function () {
//         //     let getModel = this.getView().getModel("dataModel");
//         //     let aData = getModel && getModel.getData ? getModel.getData() : [];
//         //     let entity = this.sTitle;

//         //     var oForm = sap.ui.getCore().byId("dynamicForm");
//         //     if (!oForm) { console.error("dynamicForm not found"); return; }
//         //     if (entity === "HM_HostelFeatures") {
//         //         let isEdit = !!this.oPayload;

//         //         var fixedModel = new JSONModel({
//         //             FacilityName: isEdit ? this.oPayload.FacilityName : "",
//         //             Description: isEdit ? this.oPayload.Description : "",
//         //             Photo1: isEdit ? this.oPayload.Photo1 : null,
//         //             Photo1Name: isEdit ? this.oPayload.Photo1Name : null,
//         //             Photo1Type: isEdit ? this.oPayload.Photo1Type : null,
//         //             Photo2: isEdit ? this.oPayload.Photo2 : null,
//         //             Photo2Name: isEdit ? this.oPayload.Photo2Name : null,
//         //             Photo2Type: isEdit ? this.oPayload.Photo2Type : null
//         //         });

//         //         this.getView().setModel(fixedModel, "formModel");
//         //         this._imageData = { img1: null, img1name: null, img1type: null, img2: null, img2name: null, img2type: null };

//         //         oForm.removeAllFormContainers();
//         //         var oContainer = new FormContainer({ title: "" });

//         //         oContainer.addFormElement(new FormElement({
//         //             label: new sap.m.Label({ text: "FacilityName" }),
//         //             fields: [new sap.m.Input({ value: "{formModel>/FacilityName}" })]
//         //         }));

//         //         oContainer.addFormElement(new FormElement({
//         //             label: new sap.m.Label({ text: "Description" }),
//         //             fields: [new sap.m.Input({ value: "{formModel>/Description}" })]
//         //         }));

//         //         oContainer.addFormElement(new FormElement({
//         //             label: new sap.m.Label({ text: "Add Image 1 *" }),
//         //             fields: [
//         //                 new sap.m.HBox({
//         //                     items: [
//         //                         new sap.m.Image({
//         //                             src: "{= ${formModel>/Photo1} ? 'data:' + (${formModel>/Photo1Type} || 'image/*') + ';base64,' + ${formModel>/Photo1} : '' }",
//         //                             width: "10rem",
//         //                             visible: "{= ${formModel>/Photo1} ? true : false }",
//         //                             id: "HF_Image1_Preview"
//         //                         }),
//         //                         new sap.m.Button({
//         //                             icon: "sap-icon://decline",
//         //                             type: "Transparent",
//         //                             tooltip: "Remove Image 1",
//         //                             press: function () { this._removeHostelImage(1); }.bind(this)
//         //                         }),
//         //                         new sap.ui.unified.FileUploader({
//         //                             id: "imageUpload1",
//         //                             change: this._onImageSelect.bind(this, 1)
//         //                         })
//         //                     ]
//         //                 })
//         //             ]
//         //         }));

//         //         oContainer.addFormElement(new FormElement({
//         //             label: new sap.m.Label({ text: "Add Image 2 *" }),
//         //             fields: [
//         //                 new sap.m.HBox({
//         //                     items: [
//         //                         new sap.m.Image({
//         //                             src: "{= ${formModel>/Photo2} ? 'data:' + (${formModel>/Photo2Type} || 'image/*') + ';base64,' + ${formModel>/Photo2} : '' }",
//         //                             width: "10rem",
//         //                             visible: "{= ${formModel>/Photo2} ? true : false }",
//         //                             id: "HF_Image2_Preview"
//         //                         }),
//         //                         new sap.m.Button({
//         //                             icon: "sap-icon://decline",
//         //                             type: "Transparent",
//         //                             tooltip: "Remove Image 2",
//         //                             press: function () { this._removeHostelImage(2); }.bind(this)
//         //                         }),
//         //                         new sap.ui.unified.FileUploader({
//         //                             id: "imageUpload2",
//         //                             change: this._onImageSelect.bind(this, 2)
//         //                         })
//         //                     ]
//         //                 })
//         //             ]
//         //         }));
//         //         oForm.addFormContainer(oContainer);
//         //         return;
//         //     }
//         //     let oFields = [];
//         //     if (aData && aData.length > 0) {
//         //         oFields = Object.keys(aData[0]);
//         //         this._lastFields = oFields;
//         //     } else if (this._lastFields) {
//         //         oFields = this._lastFields;
//         //     } else {
//         //         sap.m.MessageToast.show("No fields available");
//         //         return;
//         //     }
//         //     oForm.removeAllFormContainers();

//         //     var oDynamicData = {};
//         //     oFields.forEach(sField => {
//         //         let v = "";
//         //         if (this.oUpdatePass?.getModel("formModel")?.getProperty("/" + sField)) {
//         //             v = this.oUpdatePass.getModel("formModel").getProperty("/" + sField);
//         //         } else if (this.oPayload && this.oPayload[sField] != null) {
//         //             v = this.oPayload[sField];
//         //         } else {
//         //             v = "";
//         //         }
//         //         oDynamicData[sField] = v;
//         //     });

//         //     var oDynamicModel = new JSONModel(oDynamicData);
//         //     if (this.oUpdatePass && this.oUpdatePass.setModel) {
//         //         this.oUpdatePass.setModel(oDynamicModel, "formModel");
//         //     } else {
//         //         this.getView().setModel(oDynamicModel, "formModel");
//         //     }

//         //     this._imageData = { img1: null, img2: null };
//         //     var oContainerDyn = new FormContainer({ title: "" });
//         //     let that = this;

//         //     oFields.forEach(function (sField) {

//         //         let oInputControl;
//         //         if (that.sTitle === "HM_Branch") {
//         //             if (sField === "Country") {
//         //                 oInputControl = new sap.m.ComboBox({
//         //                     selectedKey: "{formModel>/Country}",
//         //                     id: "MD_Field_Country",
//         //                     required: true,
//         //                     showSecondaryValues: true,
//         //                     width: "100%",
//         //                     items: {
//         //                         path: "CountryModel>/", valueStateText: "Select Country",
//         //                         length: 1000, showSecondaryValues: true,
//         //                         template: new sap.ui.core.ListItem({
//         //                             key: "{CountryModel>countryName}",
//         //                             text: "{CountryModel>countryName}",
//         //                             additionalText: "{CountryModel>code}"  // country code
//         //                         })
//         //                     },
//         //                     selectionChange: function (oEvent) {
//         //                         const formModel = that.oUpdatePass.getModel("formModel");
//         //                         const selectedItem = oEvent.getParameter("selectedItem");
//         //                         oEvent.getSource().setValueState("None");

//         //                         if (!selectedItem) {
//         //                             formModel.setProperty("/Country", "");
//         //                             formModel.setProperty("/STD", "");
//         //                             formModel.setProperty("/State", "");
//         //                             formModel.setProperty("/City", "");
//         //                             formModel.setProperty("/countryCode", "");
//         //                             that.getView().setModel(new JSONModel([]), "FilteredStateModel");
//         //                             that.getView().setModel(new JSONModel([]), "FilteredCityModel");
//         //                             return;
//         //                         }

//         //                         const ctx = selectedItem.getBindingContext("CountryModel");
//         //                         const countryObj = ctx.getObject();

//         //                         formModel.setProperty("/Country", countryObj.countryName);
//         //                         formModel.setProperty("/STD", countryObj.stdCode || "");
//         //                         formModel.setProperty("/countryCode", countryObj.code);
//         //                         formModel.setProperty("/State", "");
//         //                         formModel.setProperty("/City", "");

//         //                         that._filterStatesByCountryCode(countryObj.code);
//         //                         that.getView().setModel(new sap.ui.model.json.JSONModel([]), "FilteredCityModel");
//         //                         sap.ui.getCore().byId("MD_Field_State").setValueState("None");
//         //                         sap.ui.getCore().byId("MD_Field_City").setValueState("None");
//         //                     }
//         //                 });
//         //             } else if (sField === "State") {
//         //                 oInputControl = new sap.m.ComboBox({
//         //                     selectedKey: "{formModel>/State}",
//         //                     id: "MD_Field_State",
//         //                     required: true,
//         //                     valueStateText: "Select State",
//         //                     width: "100%",
//         //                     items: {
//         //                         path: "FilteredStateModel>/",
//         //                         template: new sap.ui.core.ListItem({
//         //                             key: "{FilteredStateModel>stateName}",
//         //                             text: "{FilteredStateModel>stateName}"
//         //                         })
//         //                     },
//         //                     selectionChange: function (oEvent) {
//         //                         let selStateName = oEvent.getSource().getSelectedKey();
//         //                         const formModel = that.oUpdatePass.getModel("formModel");
//         //                         oEvent.getSource().setValueState("None");
//         //                         // formModel.setProperty("/State", selStateName);
//         //                         let cCode = formModel.getProperty("/countryCode");
//         //                         if (!cCode) {
//         //                             let selCountry = formModel.getProperty("/Country");
//         //                             let countries = that.getView().getModel("CountryModel").getData();
//         //                             let found = countries.find(c => c.countryName === selCountry);
//         //                             if (found) {
//         //                                 cCode = found.code;
//         //                                 formModel.setProperty("/countryCode", cCode);
//         //                             }
//         //                         }
//         //                         formModel.setProperty("/State", selStateName);
//         //                         formModel.setProperty("/City", "");

//         //                         that._filterCitiesByState(selStateName, cCode);
//         //                         sap.ui.getCore().byId("MD_Field_City").setValueState("None");

//         //                     }
//         //                 });
//         //             }
//         //             else if (sField === "City") {
//         //                 oInputControl = new sap.m.ComboBox({
//         //                     selectedKey: "{formModel>/City}",
//         //                     id: "MD_Field_City",
//         //                     required: true,
//         //                     width: "100%",
//         //                     valueStateText: "Select City",
//         //                     items: {
//         //                         path: "FilteredCityModel>/",
//         //                         template: new sap.ui.core.ListItem({
//         //                             key: "{FilteredCityModel>cityName}",
//         //                             text: "{FilteredCityModel>cityName}"
//         //                         })
//         //                     },
//         //                     selectionChange: function (oEvent) {
//         //                         oEvent.getSource().setValueState("None");
//         //                     }
//         //                 });
//         //             }
//         //             else if (sField === "STD") {
//         //                 oInputControl = new sap.m.Input({
//         //                     value: "{formModel>/STD}",
//         //                     editable: false
//         //                 });

//         //             }
//         //             else {
//         //                 if (sField === "BranchID") {
//         //                     oInputControl = new sap.m.Input({
//         //                         id: "MD_Field_BranchID",
//         //                         value: "{formModel>/BranchID}",
//         //                         maxLength: 10,
//         //                         required: true,
//         //                         editable: !that.oPayload,
//         //                         valueStateText: "Enter Branch ID",
//         //                         liveChange: function (oEvent) {
//         //                             if (that.oPayload) { return; }
//         //                             let val = oEvent.getParameter("value");
//         //                             let input = oEvent.getSource();

//         //                             if (val.trim() === "") {
//         //                                 input.setValueState("Error");
//         //                                 input.setValueStateText("Branch ID cannot be empty");
//         //                             } else {
//         //                                 input.setValueState("None");
//         //                                 input.setValueStateText("");
//         //                             }
//         //                         }
//         //                     });
//         //                 }
//         //                 else if (sField === "Name") {
//         //                     oInputControl = new sap.m.Input({
//         //                         id: "MD_Field_Name",
//         //                         required: true,
//         //                         value: "{formModel>/Name}",
//         //                         maxLength: 60,
//         //                         valueStateText: "Enter Name",
//         //                         liveChange: function (oEvent) {
//         //                             utils._LCvalidateName(oEvent);
//         //                         }
//         //                     });
//         //                 }
//         //                 else if (sField === "Address") {
//         //                     oInputControl = new sap.m.Input({
//         //                         id: "MD_Field_Address",
//         //                         required: true,
//         //                         value: "{formModel>/Address}",
//         //                         maxLength: 100,
//         //                         valueStateText: "Enter Address",
//         //                         liveChange: function (oEvent) {
//         //                             utils._LCvalidateMandatoryField(oEvent);
//         //                         }
//         //                     });
//         //                 }
//         //                 else if (sField === "Pincode") {
//         //                     oInputControl = new sap.m.Input({
//         //                         id: "MD_Field_Pincode",
//         //                         required: true,
//         //                         value: "{formModel>/Pincode}",
//         //                         maxLength: 6,
//         //                         valueStateText: "Enter Pincode",
//         //                         liveChange: function (oEvent) {
//         //                             utils._LCvalidatePinCode(oEvent);
//         //                         }
//         //                     });
//         //                 }
//         //                 else if (sField === "Contact") {
//         //                     oInputControl = new sap.m.Input({
//         //                         id: "MD_Field_Contact",
//         //                         required: true,
//         //                         valueStateText: "Enter Contact Number",
//         //                         value: "{formModel>/Contact}",
//         //                         maxLength: 10,
//         //                         liveChange: function (oEvent) {
//         //                             utils._LCvalidateMobileNumber(oEvent);
//         //                         }
//         //                     });
//         //                 }
//         //                 else {
//         //                     oInputControl = new sap.m.Input({
//         //                         value: "{formModel>/" + sField + "}"
//         //                     });
//         //                 }
//         //             }

//         //         } else {
//         //             oInputControl = new sap.m.Input({ value: "{formModel>/" + sField + "}" });
//         //         }

//         //         oContainerDyn.addFormElement(new FormElement({
//         //             label: new sap.m.Label({ text: sField.toUpperCase() }),
//         //             fields: [oInputControl]
//         //         }));
//         //     });

//         //     oForm.addFormContainer(oContainerDyn);

//         //     try {
//         //         let formModel = this.oUpdatePass.getModel("formModel");

//         //         let selCountry = formModel.getProperty("/Country");
//         //         let selState = formModel.getProperty("/State");
//         //         let selCity = formModel.getProperty("/City");
//         //         this.getView().setModel(new JSONModel([]), "FilteredStateModel");
//         //         this.getView().setModel(new JSONModel([]), "FilteredCityModel");

//         //         if (selCountry) {

//         //             let allCountries = this.getView().getModel("CountryModel").getData();
//         //             let matched = allCountries.find(c => c.countryName === selCountry);

//         //             if (matched) {
//         //                 formModel.setProperty("/countryCode", matched.code);

//         //                 this._filterStatesByCountryCode(matched.code);
//         //             }

//         //             if (selState) {
//         //                 this._filterCitiesByState(
//         //                     selState,
//         //                     formModel.getProperty("/countryCode")
//         //                 );
//         //             }
//         //             if (selCity) {
//         //                 formModel.setProperty("/City", selCity);
//         //             }
//         //         }
//         //     } catch (e) {
//         //         console.error("Prefill error:", e);
//         //     }
//         // },

//         // _filterStatesByCountryCode: function (countryCode) {
//         //     let allStates = this.getView().getModel("StateModel").getData() || [];

//         //     let filtered = allStates.filter(s =>
//         //         s.countryCode === countryCode
//         //     );

//         //     this.getView().setModel(new JSONModel(filtered), "FilteredStateModel");
//         // },

//         // _filterCitiesByState: function (stateName, countryCodeFromStateEvent) {
//         //     let formModel = this.oUpdatePass.getModel("formModel");
//         //     let cCode = countryCodeFromStateEvent || formModel.getProperty("/countryCode");

//         //     let allCities = this.getView().getModel("CityModel").getData() || [];

//         //     let filtered = allCities.filter(c =>
//         //         c.stateName === stateName &&
//         //         c.countryCode === cCode
//         //     );

//         //     this.getView().setModel(new JSONModel(filtered), "FilteredCityModel");
//         // },

//         // MD_onDownloadButtonPress: function () {
//         //     var aData = this.getView().getModel("dataModel").getData();
//         //     if (!aData.length) return MessageToast.show("No data to download");

//         //     var sCSV = Object.keys(aData[0]).join(",") + "\n";
//         //     aData.forEach(function (obj) {
//         //         sCSV += Object.values(obj).join(",") + "\n";
//         //     });
//         //     var blob = new Blob([sCSV], { type: "text/csv;charset=utf-8;" });
//         //     var link = document.createElement("a");
//         //     link.href = URL.createObjectURL(blob);
//         //     link.download = this.sTitle + ".csv";
//         //     link.click();
//         // },

//         // _onImageSelect: function (index, oEvent) {
//         //     let file = oEvent.getParameter("files")[0];
//         //     if (!file) return;
//         //     let reader = new FileReader();

//         //     reader.onload = (e) => {
//         //         let base64 = e.target.result.split(",")[1];
//         //         if (index === 1) {
//         //             this._imageData.img1 = base64;
//         //             this._imageData.img1name = file.name;
//         //             this._imageData.img1type = file.type;
//         //             if (this.oUpdatePass && this.oUpdatePass.getModel("formModel")) {
//         //                 this.oUpdatePass.getModel("formModel").setProperty("/Photo1", base64);
//         //                 this.oUpdatePass.getModel("formModel").setProperty("/Photo1Name", file.name);
//         //                 this.oUpdatePass.getModel("formModel").setProperty("/Photo1Type", file.type);
//         //             }
//         //         }

//         //         if (index === 2) {
//         //             this._imageData.img2 = base64;
//         //             this._imageData.img2name = file.name;
//         //             this._imageData.img2type = file.type;

//         //             if (this.oUpdatePass && this.oUpdatePass.getModel("formModel")) {
//         //                 this.oUpdatePass.getModel("formModel").setProperty("/Photo2", base64);
//         //                 this.oUpdatePass.getModel("formModel").setProperty("/Photo2Name", file.name);
//         //                 this.oUpdatePass.getModel("formModel").setProperty("/Photo2Type", file.type);
//         //             }
//         //         }
//         //     };

//         //     reader.readAsDataURL(file);
//         // },

//         // _openImagePopup: function (base64) {
//         //     if (!base64) {
//         //         sap.m.MessageToast.show("Image not available");
//         //         return;
//         //     }
//         //     let dialog = new sap.m.Dialog({
//         //         title: "Image Preview",
//         //         contentWidth: "40rem",
//         //         content: [
//         //             new sap.m.Image({
//         //                 src: "data:image/*;base64," + base64,
//         //                 width: "100%"
//         //             })
//         //         ],
//         //         endButton: new sap.m.Button({
//         //             text: "Close",
//         //             press: function () { dialog.close(); }
//         //         })
//         //     });
//         //     dialog.open();
//         // },

//         // MD_onEditButtonPress: function () {
//         //     var that = this;
//         //     var aSelectedItem = this.oTable.getSelectedItem();

//         //     if (!aSelectedItem) {
//         //         sap.m.MessageToast.show(that.i18nModel.getText("Select Row to Edit"));
//         //         return;
//         //     }
//         //     let oData = aSelectedItem.getBindingContext("dataModel").getObject();
//         //     let flag = true;
//         //     this.MD_onAddButtonPress(oData, flag);
//         //     this.oTable.removeSelections();
//         // },

//         // MD_onUpdateButtonPress: async function () {
//         //     sap.ui.getCore().byId("MD_id_submitButoon").setVisible(false);
//         //     var that = this;
//         //     let datafromlocalEntity = that.getView().getModel("EntityModel").getData();
//         //     let formData = this.oUpdatePass.getModel("formModel");
//         //     let myfragmentData = formData.getData();
//         //     let entityMeta = this.getView().getModel("EntityModel").getData().find(e => e.Entity === this.sTitle);

//         //     let keys = (entityMeta && entityMeta.unikey) ? entityMeta.unikey.split(",") : [];
//         //     let missingFields = keys.filter(k => !myfragmentData[k] || myfragmentData[k].toString().trim() === "");

//         //     if (missingFields.length > 0) {
//         //         sap.m.MessageToast.show("Please fill mandatory details");
//         //         return;
//         //     }

//         //     for (let i = 0; i < datafromlocalEntity.length; i++) {
//         //         if (datafromlocalEntity[i].Entity === that.sTitle) {
//         //             let keys = datafromlocalEntity[i].unikey.split(",");
//         //             let filters = {};
//         //             keys.forEach((k) => {
//         //                 filters[k] = this.oPayload ? this.oPayload[k] : myfragmentData[k];
//         //             });
//         //             let updatedData = { ...myfragmentData };
//         //             delete updatedData.BranchID;
//         //             delete updatedData.countryCode;
//         //             let resultfinak = {
//         //                 data: updatedData,
//         //                 filters: filters,
//         //             };

//         //             if (this.sTitle === "HM_HostelFeatures") {
//         //                 resultfinak.data.Photo1 = this._imageData.img1 || resultfinak.data.Photo1 || null;
//         //                 resultfinak.data.Photo1Name = this._imageData.img1name || resultfinak.data.Photo1Name || null;
//         //                 resultfinak.data.Photo1Type = this._imageData.img1type || resultfinak.data.Photo1Type || null;

//         //                 resultfinak.data.Photo2 = this._imageData.img2 || resultfinak.data.Photo2 || null;
//         //                 resultfinak.data.Photo2Name = this._imageData.img2name || resultfinak.data.Photo2Name || null;
//         //                 resultfinak.data.Photo2Type = this._imageData.img2type || resultfinak.data.Photo2Type || null;

//         //                 if (!resultfinak.data.Photo1) {
//         //                     sap.m.MessageToast.show("Please upload Photo 1");
//         //                     try { sap.ui.getCore().byId("imageUpload1").focus(); } catch (e) { }
//         //                     return;
//         //                 }
//         //                 if (!resultfinak.data.Photo2) {
//         //                     sap.m.MessageToast.show("Please upload Photo 2");
//         //                     try { sap.ui.getCore().byId("imageUpload2").focus(); } catch (e) { }
//         //                     return;
//         //                 }
//         //             }

//         //             if (this.sTitle === "HM_Branch") {
//         //                 if (!this.oPayload) {
//         //                     if (!utils._LCvalidateMandatoryField({ getSource: () => sap.ui.getCore().byId("MD_Field_BranchID") })) {
//         //                         return;
//         //                     }
//         //                 }
//         //                 if (!utils._LCvalidateName({ getSource: () => sap.ui.getCore().byId("MD_Field_Name") })) {
//         //                     return;
//         //                 }
//         //                 if (!utils._LCvalidateMandatoryField({ getSource: () => sap.ui.getCore().byId("MD_Field_Address") })) {
//         //                     return;
//         //                 }
//         //                 if (!utils._LCvalidatePinCode({ getSource: () => sap.ui.getCore().byId("MD_Field_Pincode") })) {
//         //                     return;
//         //                 }
//         //                 if (!utils._LCstrictValidationComboBox({ getSource: () => sap.ui.getCore().byId("MD_Field_Country") })) {
//         //                     return;
//         //                 }
//         //                 if (!utils._LCstrictValidationComboBox({ getSource: () => sap.ui.getCore().byId("MD_Field_State") })) {
//         //                     return;
//         //                 }
//         //                 if (!utils._LCstrictValidationComboBox({ getSource: () => sap.ui.getCore().byId("MD_Field_City") })) {
//         //                     return;
//         //                 }
//         //                 if (!utils._LCvalidateMobileNumber({ getSource: () => sap.ui.getCore().byId("MD_Field_Contact") })) {
//         //                     return;
//         //                 }
//         //             }

//         //             sap.ui.core.BusyIndicator.show(0);
//         //             that.ajaxUpdateWithJQuery(this.sTitle, resultfinak).then(async (res) => {
//         //                 let oModel = that.getView().getModel("dataModel");
//         //                 that.MD_onCancelButtonPress();
//         //                 const tableUpdateData = await that.ajaxReadWithJQuery(that.sTitle, "");
//         //                 oModel.setData(tableUpdateData.data);
//         //                 sap.ui.core.BusyIndicator.hide();
//         //                 sap.m.MessageToast.show("Data updated successfully");
//         //             })
//         //                 .catch((error) => {
//         //                     sap.ui.core.BusyIndicator.hide();
//         //                     sap.m.MessageToast.show("Update failed");
//         //                     that.MD_onCancelButtonPress();
//         //                 });
//         //             this.oTable.removeSelections();
//         //         }
//         //     }
//         // },

//         // MD_onDeleteButtonPress: async function () {
//         //     var that = this;
//         //     var aSelectedItems = this.oTable.getSelectedItems();

//         //     if (aSelectedItems.length === 0) {
//         //         sap.m.MessageToast.show(that.i18nModel.getText("Select Row to Delete"));
//         //         return;
//         //     }
//         //     sap.m.MessageBox.confirm("Are you sure you want to delete the selected record?", {
//         //         title: "Confirm Deletion",
//         //         onClose: function (oAction) {
//         //             if (oAction === sap.m.MessageBox.Action.OK) {
//         //                 sap.ui.core.BusyIndicator.show(0);
//         //                 aSelectedItems.forEach(function (oItem) {
//         //                     var oContext = oItem.getBindingContext("dataModel");
//         //                     var oRowData = oContext.getObject();
//         //                     let datafromlocalEntity = that.getView().getModel("EntityModel").getData();
//         //                     for (let i = 0; i < datafromlocalEntity.length; i++) {
//         //                         if (datafromlocalEntity[i].Entity === that.sTitle) {
//         //                             let keys = datafromlocalEntity[i].unikey.split(",");
//         //                             let filters = {};
//         //                             keys.forEach((k) => {
//         //                                 if (!filters[k]) {
//         //                                     filters[k] = [];
//         //                                 }
//         //                                 filters[k].push(oRowData[k]);
//         //                             });

//         //                             let resultfinak = { filters: filters };
//         //                             that.ajaxDeleteWithJQuery(that.sTitle, resultfinak).then(async (res) => {
//         //                                 let oModel = that.getView().getModel("dataModel");
//         //                                 const tableUpdateData = await that.ajaxReadWithJQuery(that.sTitle, "");
//         //                                 oModel.setData(tableUpdateData.data);
//         //                                 sap.ui.core.BusyIndicator.hide();
//         //                                 sap.m.MessageToast.show(that.i18nModel.getText("Data Deleted Successfully"));
//         //                             });
//         //                         }
//         //                     }
//         //                 });
//         //                 that.oTable.removeSelections();
//         //             } else {
//         //                 that.oTable.removeSelections();
//         //             }
//         //         }
//         //     });
//         // },

//         onNavBack: function () {
//             var oRouter = this.getOwnerComponent().getRouter();
//             oRouter.navTo("TilePage");
//         },

//         onHome: function () {
//             var oRouter = this.getOwnerComponent().getRouter();
//             oRouter.navTo("RouteHostel");
//         },
//     });
// });