sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "../model/formatter",
    "../utils/validation",
    "sap/ui/export/Spreadsheet"
], function (BaseController, JSONModel, Filter, FilterOperator, MessageToast, formatter, utils, Spreadsheet) {
    "use strict";
    return BaseController.extend("sap.kt.com.minihrsolution.controller.AppliedCandidates", {
        formatter: formatter,
        onInit: function () {
            const router = this.getOwnerComponent().getRouter();
            router.getRoute("AppliedCandidates").attachPatternMatched(this._onObjectMatched, this);
        },
        _onObjectMatched: async function () {
            var LoginFUnction = await this.commonLoginFunction("AppliedCandidates");
            if (!LoginFUnction) return;
            this.i18na = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            this.getView().setModel(new JSONModel({
                minnDate: new Date(),
                maxDates: new Date(new Date().setDate(new Date().getDate() + 30))
            }), "myyModel");
            this.getView().setModel(new JSONModel({
                NameState: "None", ExpectedCTCState: "None", CurrentCTCState: "None",
                AvailableForInterviewState: "None", NoticePeriodState: "None", MobileNumberState: "None",
                DateState: "None", EmailIDState: "None", ExperienceState: "None",
                RemarkState: "None", SkillsState: "None", City: "None"
            }), "modelValuStateError");
            this.getView().setModel(new JSONModel({ Editable: true }), "EditableModeltruefalse");
            this.getView().setModel(new JSONModel({ results: [{ key: "YES", text: "YES" }, { key: "NO", text: "NO" }] }), "setInterviewYesNo");
            this.AC_ReadCall();
            this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18na.getText("TableHeader"));
            this.onFilterBarClear();
            this.getView().setModel(new JSONModel({
                isEditMode: false, busy: false
            }), "viewModel");
            //this._makeDatePickersReadOnly(["filterExperience"]);
            this._FragmentDatePickersReadOnly(["FM_Id_DateAvlForInterview"]);
            this.initializeBirthdayCarousel();
        },
        AC_ReadCall: async function () {
            this.getBusyDialog();
            try {
                // the columns you need for the table view.
                const aSelectFields = [
                    "FullName",
                    "NoticePeriod",
                    "Email",
                    "Experience"
                ];
                const oQueryParameters = {
                    "$select": aSelectFields.join(",")
                };

                const response = await this.ajaxReadWithJQuery("JobApplications", { parameters: oQueryParameters });

                const aCandidates = response.data || [];
                this.getOwnerComponent().setModel(new JSONModel(aCandidates), "DataTableModel");
                const nameSet = new Set(aCandidates.map(c => c.FullName).filter(Boolean));
                this.getView().setModel(new JSONModel(Array.from(nameSet).map(name => ({ FullName: name }))), "UniqueNamesModel");
            } catch (err) {
                MessageToast.show("Failed to load candidate data.");
            } finally {
                this.closeBusyDialog();
            }
        },
        onPressback: function () {
            this.getOwnerComponent().getRouter().navTo("RouteTilePage");
        },
        onLogout: function () {
            this.CommonLogoutFunction();
        },
        onCandidatePress: function (oEvent) {
            const id = oEvent.getSource().getBindingContext("DataTableModel").getObject().ID;
            this.getOwnerComponent().getRouter().navTo("AppliedCanDetail", { id: id });
        },
        onFilterBarClear: function () {
            this.byId("filterEmployeeName").setSelectedKey("");
            this.byId("filterNoticePeriod").setValue("");
            this.byId("filterSkills").setValue("");
            this.byId("filterExperience").setSelectedKey("");
            // const oBinding = this.byId("appliedCandidatesTable").getBinding("items");
            // if (oBinding) {
            //     oBinding.filter([]);
            // }
        },
        onFilterBarSearch: function () {
            this.getBusyDialog();
            setTimeout(() => {
                try {
                    const oTableBinding = this.byId("appliedCandidatesTable").getBinding("items");
                    const aFilters = [];
                    // 1. Name Filter
                    const sName = this.byId("filterEmployeeName").getValue().trim();
                    if (sName) {
                        aFilters.push(new Filter("FullName", FilterOperator.Contains, sName));
                    }
                    // 2. Notice Period Filter
                    const sNoticePeriodInput = this.byId("filterNoticePeriod").getValue().trim();
                    if (sNoticePeriodInput) {
                        aFilters.push(new Filter({
                            path: "NoticePeriod",
                            test: function (sDataValue) {
                                if (!sDataValue || !sNoticePeriodInput) return false;
                                const data = sDataValue.toString().trim();
                                const input = sNoticePeriodInput.toString().trim();
                                // User typed a single number or non-range string
                                if (!input.includes('-')) {
                                    return data.toLowerCase() === input.toLowerCase();
                                }
                                // User selected a range (e.g., "0-15")
                                else {
                                    if (data.toLowerCase() === input.toLowerCase()) {
                                        return true;
                                    }
                                    if (!data.includes('-')) {
                                        try {
                                            const numData = parseInt(data, 10);
                                            if (isNaN(numData)) return false;
                                            const rangeParts = input.split('-');
                                            const min = parseInt(rangeParts[0].trim(), 10);
                                            const max = parseInt(rangeParts[1].trim(), 10);
                                            if (isNaN(min) || isNaN(max)) return false;
                                            return numData >= min && numData <= max;
                                        } catch (e) { return false; }
                                    }
                                    return false;
                                }
                            }
                        }));
                    }
                    // 3. Skills Filter
                    const sSkills = this.byId("filterSkills").getValue().trim();
                    if (sSkills) {
                        aFilters.push(new Filter("Skills", FilterOperator.Contains, sSkills));
                    }
                    // 4. Experience Filter
                    const sExperienceInput = this.byId("filterExperience").getValue().trim();
                    if (sExperienceInput) {
                        aFilters.push(new Filter({
                            path: "Experience",
                            test: function (sDataValue) {
                                if (!sDataValue || !sExperienceInput) return false;
                                const data = sDataValue.toString().trim();
                                const input = sExperienceInput.toString().trim();
                                // User typed a single number
                                if (!input.includes('-')) {
                                    return data.toLowerCase() === input.toLowerCase();
                                }
                                // User selected a range
                                else {
                                    if (data.toLowerCase() === input.toLowerCase()) return true;
                                    if (!data.includes('-')) {
                                        try {
                                            const numData = parseFloat(data);
                                            if (isNaN(numData)) return false;
                                            const rangeParts = input.split('-');
                                            const min = parseFloat(rangeParts[0].trim());
                                            const max = parseFloat(rangeParts[1].trim());
                                            if (isNaN(min) || isNaN(max)) return false;
                                            return numData >= min && numData <= max;
                                        } catch (e) { return false; }
                                    }
                                    return false;
                                }
                            }
                        }));
                    }
                    oTableBinding.filter(aFilters);
                } catch (error) {
                    MessageToast.show("Error during filtering.");
                } finally {
                    setTimeout(() => this.closeBusyDialog(), 300);
                }
            }, 50);
        },

        onSuggestSkills: function (oEvent) {
            let sValue = oEvent.getParameter("suggestValue")?.toLowerCase() || "";
            let aTableData = this.getView().getModel("DataTableModel").getData();
            let aMatchingSkillStrings = aTableData
                .map(item => item.Skills?.trim())
                .filter(skillStr => {
                    if (!skillStr) return false;
                    return skillStr.split(",").some(skill => skill.trim().toLowerCase().includes(sValue));
                });
            let aUniqueSkillStrings = [...new Set(aMatchingSkillStrings)];
            let aSuggestionItems = aUniqueSkillStrings.map(skill => ({ skill }));
            this.getView().setModel(new JSONModel({ skills: aSuggestionItems }), "skillModel");
        },

        onAddNewCandidate: function () {
            const oNewCandidate = {
                FullName: "",
                ExpectedSalary: "",
                CurrentSalary: "",
                AvailableForInterview: "",
                NoticePeriod: "",
                Mobile: "",
                Date: "",
                Email: "",
                Experience: "",
                Remark: "",
                Skills: "",
                ISD: "+91",
                City: "",
                Country: "IN"
            };
            this.getView().setModel(new JSONModel(oNewCandidate), "stuDataModel");
            this._openDialog("Create Candidate", true);
            this.getView().getModel("EditableModeltruefalse").setProperty("/Editable", true);
        },
        onEditCandidate: function () {
            const oTable = this.byId("appliedCandidatesTable");
            const oSelectedItem = oTable.getSelectedItem();
            if (!oSelectedItem) {
                MessageToast.show(this.i18na.getText("MessageNoRowSelected"));
                return;
            }
            const oContext = oSelectedItem.getBindingContext("DataTableModel");
            const oCandidateData = jQuery.extend({}, oContext.getObject());
            if (oCandidateData.Date === "1899-11-30T00:00:00.000Z") oCandidateData.Date = null;
            if (oCandidateData.NoticePeriod === "0") oCandidateData.NoticePeriod = "Immediate";
            this.getView().setModel(new JSONModel(oCandidateData), "stuDataModel");
            this._openDialog("Edit Candidate", false);
            this.getView().getModel("EditableModeltruefalse").setProperty("/Editable", false);
        },
        onDeleteCandidate: function () {
            const oTable = this.byId("appliedCandidatesTable");
            const oSelectedItem = oTable.getSelectedItem();
            if (!oSelectedItem) {
                MessageToast.show(this.i18na.getText("MessageNoRowSelected"));
                return;
            }
            const sID = oSelectedItem.getBindingContext("DataTableModel").getObject().ID;
            this.showConfirmationDialog(
                this.i18na.getText("confirmTitle"),
                this.i18na.getText("ConfirmRecruitmentDeleteMessage"),
                async () => {
                    this.getBusyDialog();
                    try {
                        await this.ajaxDeleteWithJQuery("JobApplications", { filters: { ID: sID } });
                        MessageToast.show(this.i18na.getText("dataDelteSucces"));
                        this.AC_ReadCall(); // Refresh the table
                    } catch (error) {
                        MessageToast.show("Delete failed.");
                    } finally {
                        this.closeBusyDialog();
                        oTable.removeSelections();
                    }
                }
            );
        },
        _preparePayload: function () {
            if (!this._validateAllDialogFields()) {
                return null;
            }
            const oPayload = jQuery.extend({}, this.getView().getModel("stuDataModel").getData());
            let noticePeriodValue = sap.ui.getCore().byId("FM_RE_NoticePeriod").getValue().trim();
            oPayload.NoticePeriod = noticePeriodValue.toLowerCase() === 'immediate' ? "0" : noticePeriodValue;
            let dateValue = sap.ui.getCore().byId("FM_Id_DateAvlForInterview").getValue();
            if (dateValue) {
                oPayload.Date = dateValue.split(".").reverse().join("/");
            }
            if (!oPayload.ID) {
                const sUserName = this.getOwnerComponent().getModel("LoginModel").getProperty("/EmployeeName");
                const sUserID = this.getOwnerComponent().getModel("LoginModel").getProperty("/EmployeeID");
                oPayload.CreatedBy = `${sUserName} (${sUserID})`;
            }
            return oPayload;
        },

        onSaveNewCandidate: async function () {
            const oPayload = this._preparePayload();
            if (!oPayload) return;
            this.getBusyDialog();
            try {
                await this.ajaxCreateWithJQuery("JobApplications", { data: oPayload });
                MessageToast.show(this.i18na.getText("messageTraineeCreated"));
                this.AC_ReadCall(); // Refresh data
                this._closeDialog();
            } catch (err) {
                MessageToast.show(err.message || err.responseText);
            } finally {
                this.closeBusyDialog();
            }
        },
        onUpdateCandidate: async function () {
            const oPayload = this._preparePayload();
            if (!oPayload) return;
            this.getBusyDialog();
            try {
                await this.ajaxUpdateWithJQuery("JobApplications", { data: oPayload, filters: { ID: oPayload.ID } });
                MessageToast.show(this.i18na.getText("dataUpdatedSuccess"));
                this.AC_ReadCall(); // Refresh data
                this._closeDialog();
            } catch (error) {
                MessageToast.show("Update failed.");
            } finally {
                this.closeBusyDialog();
            }
        },
        _openDialog: function (sTitle, bIsCreate) {
            if (!this.oDialog) {
                this.oDialog = sap.ui.core.Fragment.load({
                    name: "sap.kt.com.minihrsolution.fragment.AddRecruitment",
                    controller: this
                }).then(oDialog => {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                });
            }
            this.oDialog.then(oDialog => {
                oDialog.setTitle(sTitle);
                sap.ui.getCore().byId("FM_Id_SubmitBTN").setVisible(bIsCreate);
                sap.ui.getCore().byId("FM_Id_EditBTN").setVisible(!bIsCreate);
                if (!bIsCreate) {
                    sap.ui.getCore().byId("FM_Id_EditBTN").setText("Edit").setType("Emphasized");
                }
                oDialog.open();
            });
        },
        _closeDialog: function () {
            if (this.oDialog) {
                this.oDialog.then(oDialog => oDialog.close());
            }
            sap.ui.getCore().byId("FM_RE_Name").setValueState("None");
            sap.ui.getCore().byId("FM_RE_CurrentCTC").setValueState("None");
            sap.ui.getCore().byId("FM_RE_ExpectedCTC").setValueState("None");
            sap.ui.getCore().byId("FM_RE_AvlInterview").setValueState("None");
            sap.ui.getCore().byId("FM_RE_NoticePeriod").setValueState("None");
            sap.ui.getCore().byId("FM_Id_MobileNumber").setValueState("None");
            sap.ui.getCore().byId("FM_Id_DateAvlForInterview").setValueState("None");
            sap.ui.getCore().byId("FM_Id_Email").setValueState("None");
            sap.ui.getCore().byId("FM_Id_Experience").setValueState("None");
            sap.ui.getCore().byId("FM_Id_Skills").setValueState("None");
            sap.ui.getCore().byId("FM_Id_City").setValueState("None");
            this.getView().byId("appliedCandidatesTable").removeSelections();
        },

        onDialogEditToggle: function () {
            const oEditButton = sap.ui.getCore().byId("FM_Id_EditBTN");
            if (oEditButton.getText() === "Edit") {
                this.getView().getModel("EditableModeltruefalse").setProperty("/Editable", true);
                oEditButton.setText("Save").setType("Accept");
            } else {
                this.onUpdateCandidate();
            }
        },
        onDialogCountryChange: function (oEvent) {
            const sCountryCode = oEvent.getSource().getSelectedKey();
            const oCityComboBox = sap.ui.getCore().byId("FM_Id_City");
            oCityComboBox.getBinding("items").filter(new Filter("CountryCode", FilterOperator.EQ, sCountryCode));
            this.getView().getModel("stuDataModel").setProperty("/City", "");
        },

        _validateAllDialogFields: function () {
            try {
                const isValid =
                    utils._LCvalidateName(sap.ui.getCore().byId("FM_RE_Name"), "ID") &&
                    utils._LCvalidateAmount(sap.ui.getCore().byId("FM_RE_CurrentCTC"), "ID") &&
                    utils._LCvalidateAmount(sap.ui.getCore().byId("FM_RE_ExpectedCTC"), "ID") &&
                    utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FM_RE_NoticePeriod"), "ID") &&
                    utils._LCstrictValidationComboBox(sap.ui.getCore().byId("FM_Id_City"), "ID") &&
                    utils._LCvalidateMobileNumber(sap.ui.getCore().byId("FM_Id_MobileNumber"), "ID") &&
                    utils._LCvalidateEmail(sap.ui.getCore().byId("FM_Id_Email"), "ID") &&
                    utils._LCvalidateAmount(sap.ui.getCore().byId("FM_Id_Experience"), "ID") &&
                    utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FM_Id_Skills"), "ID");

                if (!isValid) {
                    MessageToast.show(this.i18na.getText("mandetoryFields"));
                }
                return isValid;
            } catch (error) {
                MessageToast.show("An error occurred during validation.");
                return false;
            }
        },

        // validation handlers 
        onValidateName: (oEvent) => utils._LCvalidateName(oEvent),
        onValidateCTC: (oEvent) => utils._LCvalidateAmount(oEvent),
        onValidateMobile: (oEvent) => utils._LCvalidateMobileNumber(oEvent),
        onValidateEmail: (oEvent) => utils._LCvalidateEmail(oEvent),
        onValidateMandatoryField: (oEvent) => utils._LCvalidateMandatoryField(oEvent),
        onDropdownChange: (oEvent) => utils._LCstrictValidationComboBox(oEvent),

        onExport: function () {
            const aData = this.getView().getModel("DataTableModel").getData();
            const aCols = [
                { label: "Name", property: "FullName" },
                { label: "Current CTC (LPA)", property: "CurrentSalary" },
                { label: "Expected CTC (LPA)", property: "ExpectedSalary" },
                { label: "Notice Period (Days)", property: "NoticePeriod", template: "{0}" }, // Template to handle '0'
                { label: "Mobile Number", property: "Mobile" },
                { label: "Email", property: "Email" },
                { label: "Experience (Years)", property: "Experience" },
                { label: "Skills", property: "Skills" }
            ];
            const oSettings = {
                workbook: { columns: aCols },
                dataSource: aData,
                fileName: "Candidate_Data.xlsx"
            };
            const oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(() => oSheet.destroy());
        },


        SalaryInfoPress: function (oEvent) {
            if (!this._oPopover) {
                this._oPopover = new sap.m.Popover({
                    contentWidth: "300px",
                    contentHeight: "auto",
                    showHeader: false,
                    placement: sap.m.PlacementType.Bottom,
                    content: [new sap.m.VBox({
                        alignItems: "Center", justifyContent: "Center", width: "100%",
                        items: [new sap.m.Text({ text: this.i18na.getText("salaryPackageInfo"), wrapping: true })]
                    }).addStyleClass("customPopoverContent")]
                });
                this.getView().addDependent(this._oPopover);
            }
            this._oPopover.openBy(oEvent.getSource());
        },
    })
})