sap.ui.define([
    "./BaseController", "../utils/validation", "sap/ui/model/json/JSONModel", "sap/m/MessageToast", "../model/formatter"

],
    function (BaseController, utils, JSONModel, MessageToast, Formatter) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.SelfService", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteSelfService").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function () {
                this.EmployeeID = this.getOwnerComponent().getModel("LoginModel").getProperty("/EmployeeID");
                this.byId("SS_id_IconTab").setSelectedKey("employeeDetailsKey");
                this.EduFolderID = this.getOwnerComponent().getModel("LoginModel").getProperty("/FolderID");
                this.EmpFolderID = this.getOwnerComponent().getModel("LoginModel").getProperty("/EmploymentDetailFolderID");
                this._fetchCommonData("Designation", "sDesignationModel");
                this._fetchCommonData("BaseLocation", "sBaseLocationModel");
                this._fetchCommonData("EmployeeDetails", "sEmployeeModel", {
                    EmployeeID: this.EmployeeID
                });
                this._fetchCommonData("EducationalDetails", "sEducationModel", {
                    EmployeeID: this.EmployeeID
                });
                this._fetchCommonData("EmploymentDetails", "sEmploymentModel", {
                    EmployeeID: this.EmployeeID
                });
                var viewModel = new JSONModel({
                    fragmentSave: false, fragmentSubmit: false, isEditMode: false, EmployeeStatus: false,
                    isRoleMode: false, Max: new Date(), isVisitMode: true, isIdMode: true,
                });
                this.getView().setModel(viewModel, "viewModel");
                this.ViewModel = this.getView().getModel("viewModel");
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle()
                this.getView().getModel("LoginModel").setProperty("/HeaderName", "My Details");
                this.setEduButtonsEnabled(false);
                this.setEmpButtonsEnabled(false);
            },
            SS_commonEduFunction() {
                var eduModel = new JSONModel({
                    EmployeeID: this.EmployeeID,
                    CollegeName: "",
                    DegreeName: "",
                    EducationStartDate: "",
                    EducationEndDate: "",
                    Grade: "",
                    GradeType: "",
                });
                this.getView().setModel(eduModel, "educationModel");
            },
            SS_commonEmpFunction() {
                var empModel = new JSONModel({
                    EmployeeID: this.EmployeeID,
                    CompanyName: "",
                    Designation: "",
                    StartDate: "",
                    EndDate: "",
                    OfficeAddress: "",
                    RCISal: "",
                    RCIName: "",
                    RCIAddress: "",
                    RCIEmailID: "",
                    RCIMobileNo: "",
                    RCIISal: "",
                    RCIIName: "",
                    RCIIAddress: "",
                    RCIIEmailID: "",
                    RCIIMobileNo: "",
                });
                this.getView().setModel(empModel, "employmentModel");
            },

            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            onLogout: function () {
                this.getRouter().navTo("RouteLoginPage");
            },
            //Common dialog open function
            SS_commonOpenDialog: function (dialogProperty, fragmentName, datePickerIds = []) {
                if (!this[dialogProperty]) {
                    sap.ui.core.Fragment.load({
                        name: fragmentName,
                        controller: this,
                    }).then(oDialog => {
                        this[dialogProperty] = oDialog;
                        this.getView().addDependent(oDialog);
                        this._FragmentDatePickersReadOnly(datePickerIds);
                        oDialog.open();
                    });
                } else {
                    this._FragmentDatePickersReadOnly(datePickerIds);
                    this[dialogProperty].open();
                }
            },

            //Education dialog open
            EdF_AddEdu: function () {
                this.ViewModel.setProperty("/fragmentSubmit", true);
                this.ViewModel.setProperty("/fragmentSave", false);
                this.SS_commonEduFunction();
                this.SS_commonOpenDialog("SEd_oDialog", "sap.kt.com.minihrsolution.fragment.AddEducation", ["AddEd_id_StartEdu", "AddEd_id_EndEdu"]);
            },
            //Date change validation function
            onStartDateChange: function (oEvent) {
                let oStartDate = oEvent.getSource().getDateValue();
                let oEndDatePicker = sap.ui.getCore().byId("AddEd_id_EndEdu");

                if (oEndDatePicker) {
                    let oEndDate = oEndDatePicker.getDateValue();
                    oEndDatePicker.setMinDate(oStartDate);
                    if (oEndDate && oEndDate < oStartDate) {
                        oEndDatePicker.setDateValue(null);
                    }
                }
            },
            setEduButtonsEnabled: function (bEnabled) {
                this.byId("EdF_id_EduEdit").setEnabled(bEnabled);
                this.byId("EdF_id_EduDelete").setEnabled(bEnabled);
            },
            setEmpButtonsEnabled: function (bEnabled) {
                this.byId("EMF_id_EmpEdit").setEnabled(bEnabled);
                this.byId("EMF_id_EmpDelete").setEnabled(bEnabled);
            },

            //Education dialog close
            AddEd_onCloseDial: function () {
                this.SEd_oDialog.close();
                this.byId("EdF_id_EduTable").removeSelections(true);
                this.setEduButtonsEnabled(false);
            },
            //Employment dialog open
            EmpF_onAddEmployment: function () {
                this.ViewModel.setProperty("/fragmentSubmit", true);
                this.ViewModel.setProperty("/fragmentSave", false);
                this.SS_commonEmpFunction();
                this.SS_commonOpenDialog("SEmp_oDialog", "sap.kt.com.minihrsolution.fragment.AddEmployment", ["AddEmp_id_StartDate", "AddEmp_id_EndDate"]);
            },
            EdF_EduAttachment: function () {
                var folderUrl = `https://workplace.zoho.in/#workdrive_app/home/63sop752ea6e63ddd4a8880466f5ae509b85a/privatespace/sharedwithme/allusers/${this.EduFolderID}`;
                window.open(folderUrl, "_blank");
            },
            EdF_EmpAttachment: function () {
                var folderUrl = `https://workplace.zoho.in/#workdrive_app/home/63sop752ea6e63ddd4a8880466f5ae509b85a/privatespace/sharedwithme/allusers/${this.EmpFolderID}`;
                window.open(folderUrl, "_blank");
            },
            //Employment dialog close
            AddEmp_onClose: function () {
                this.SEmp_oDialog.close();
                this.byId("EmpF_id_EmpTable").removeSelections(true);
                this.setEmpButtonsEnabled(false);
            },
            //validation function calling from base controller
            SS_validateMobileNo: function (oEvent) {
                utils._LCvalidateMobileNumber(oEvent);
            },
            SS_validateName: function (oEvent) {
                utils._LCvalidateName(oEvent);
            },
            SS_validateVoterId: function (oEvent) {
                utils._LCvalidateVoterId(oEvent);
            },
            SS_validateAadharCard: function (oEvent) {
                utils._LCvalidateAadharCard(oEvent);
            },
            SS_validatePassport: function (oEvent) {
                utils._LCvalidatePassport(oEvent);
            },
            SS_validatePanCard: function (oEvent) {
                utils._LCvalidatePanCard(oEvent);
            },
            SS_validateAccountNo: function (oEvent) {
                utils._LCvalidateAccountNo(oEvent);
            },
            SS_validateIfcCode: function (oEvent) {
                utils._LCvalidateIfcCode(oEvent);
            },
            SS_validateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
            },
            SS_ValidateCommonFields: function (oEvent) {
                utils._LCvalidateMandatoryField(oEvent);
            },
            SS_validateEmail: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
            },
            SS_validateGrade: function (oEvent) {
                var sGradeTypeId = "AddEd_id_GradeType";
                var oGradeField = oEvent.getSource();
                if (oGradeField && sap.ui.getCore().byId(sGradeTypeId)) {
                    utils._LCvalidateGrade(oGradeField, "ID", sGradeTypeId);
                }
            },
            SS_validateGradeType: function () {
                var oGradeField = sap.ui.getCore().byId("AddEd_id_Grade");
                if (oGradeField) {
                    utils._LCvalidateGrade(oGradeField, "ID", "AddEd_id_GradeType");
                }
            },
            //Edit buttton visibility
            SS_onEditPress: function () {
                var isEditMode = this.getView().getModel("viewModel").getProperty("/isEditMode");
                if (isEditMode) {
                    if (this.SS_onSavePress()) {  // Call Save function and check validation
                        this.getView().getModel("viewModel").setProperty("/isEditMode", false);
                    }
                } else {
                    this.getView().getModel("viewModel").setProperty("/isEditMode", true);
                }
            },
            //Basic detail update call
            SS_onSavePress: function () {
                try {
                    if (utils._LCvalidateDate(this.byId("SS_id_Dob"), "ID") && utils._LCvalidateMandatoryField(this.byId("SS_id_PAddress"), "ID") && utils._LCvalidateMandatoryField(this.byId("SS_id_CAdress"), "ID") && utils._LCvalidateMobileNumber(this.byId("SS_id_MobileNo"), "ID") && utils._LCvalidateName(this.byId("SS_id_AcName"), "ID") && utils._LCvalidateAccountNo(this.byId("SS_id_Acno"), "ID") &&
                        utils._LCvalidateMandatoryField(this.byId("SS_id_BankName"), "ID") && utils._LCvalidateMandatoryField(this.byId("SS_id_Branch"), "ID") && utils._LCvalidateIfcCode(this.byId("SS_id_IfcsCode"), "ID") && utils._LCvalidateMandatoryField(this.byId("SS_id_Address"), "ID") && utils._LCvalidatePanCard(this.byId("SS_id_Pan"), "ID") && utils._LCvalidateAadharCard(this.byId("SS_idAdhar"), "ID") && utils._LCvalidatePassport(this.byId("SS_id_Passport"), "ID") &&
                        utils._LCvalidateVoterId(this.byId("SS_id_Voterid"), "ID") && utils._LCvalidateName(this.byId("SS_id_EmeNameF"), "ID") && utils._LCvalidateMobileNumber(this.byId("SS_id_EmpMoF"), "ID") && utils._LCvalidateMandatoryField(this.byId("SS_id_AddF"), "ID") && utils._LCvalidateName(this.byId("SS_id_NameS"), "ID") && utils._LCvalidateMobileNumber(this.byId("SS_id_EmpMoS"), "ID") && utils._LCvalidateMandatoryField(this.byId("SS_id_EmpAddS"), "ID")) {
                        sap.ui.core.BusyIndicator.show(0);
                        var oDataModel = this.getView().getModel("sEmployeeModel").getData()[0];
                        oDataModel.EmergencyContactPerson1Salutation = this.getView().byId("SS_idEmeSalF").getSelectedKey();
                        oDataModel.EmergencyContactPerson2Salutation = this.getView().byId("SS_idEmeSalS").getSelectedKey();
                        oDataModel.EmergencyContactPerson1Realtion = this.getView().byId("SS_idRelF").getSelectedKey();
                        oDataModel.EmergencyContactPerson2Realtion = this.getView().byId("SS_idRelS").getSelectedKey();
                        var oPayload = {
                            data: oDataModel,
                            filters: {
                                EmployeeID: this.EmployeeID
                            }
                        };
                        this.ajaxUpdateWithJQuery("EmployeeDetails", oPayload).then((oData) => {
                            sap.ui.core.BusyIndicator.hide();
                            if (oData.success) {
                                MessageToast.show(this.i18nModel.getText("dataSaved"));
                                this.getView().getModel("viewModel").setProperty("/isEditMode", false);
                            } else {
                                MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                            }
                        }).catch((oError) => {
                            sap.ui.core.BusyIndicator.hide();
                            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                        });
                    } else {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    }
                } catch (err) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            },
            EDF_onSelectionChange: function (oEvent) {
                const aSelectedIndices = oEvent.getSource().getSelectedItems();
                if (aSelectedIndices.length > 0) {
                    this.setEduButtonsEnabled(true);

                } else {
                    this.setEduButtonsEnabled(false);
                }
            },
            EDF_EditEducation: function () {
                var oSelectedItem = this.byId("EdF_id_EduTable").getSelectedItem();
                if (oSelectedItem) {
                    var oData = oSelectedItem.getBindingContext("sEducationModel").getObject();
                    this.getView().getModel("educationModel").setData(oData);
                    this.ViewModel.setProperty("/fragmentSubmit", false);
                    this.ViewModel.setProperty("/fragmentSave", true);
                    this.SS_commonOpenDialog("SEd_oDialog", "sap.kt.com.minihrsolution.fragment.AddEducation", ["AddEd_id_StartEdu", "AddEd_id_EndEdu"]);
                } else {
                    MessageToast.show(this.i18nModel.getText("selectRow"));
                }
            },
            //Education detail create call
            saveEducationDetails: function (bIsCreate) {
                try {
                    const isValid = utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AddEd_id_College"), "ID") &&
                        utils._LCvalidateDate(sap.ui.getCore().byId("AddEd_id_StartEdu"), "ID") &&
                        utils._LCvalidateDate(sap.ui.getCore().byId("AddEd_id_EndEdu"), "ID") &&
                        utils._LCvalidateGrade(sap.ui.getCore().byId("AddEd_id_Grade"), "ID", "AddEd_id_GradeType");
                    if (!isValid) {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                        return;
                    }
                    // Get and prepare model data
                    let oModel = this.getView().getModel("educationModel").getData();
                    oModel.EmployeeID = this.EmployeeID;
                    oModel.DegreeName = sap.ui.getCore().byId("AddEd_id_Degree").getSelectedKey() || "";
                    oModel.GradeType = sap.ui.getCore().byId("AddEd_id_GradeType").getSelectedKey() || "";
                    oModel.EducationStartDate = sap.ui.getCore().byId("AddEd_id_StartEdu").getDateValue() || "";
                    oModel.EducationEndDate = sap.ui.getCore().byId("AddEd_id_EndEdu").getDateValue() || "";
                    oModel.EducationStartDate = this.Formatter.convertToISODateFormat(oModel.EducationStartDate);
                    oModel.EducationEndDate = this.Formatter.convertToISODateFormat(oModel.EducationEndDate);

                    let oPayload;
                    let fnCall;
                    let sSuccessMessage;

                    if (bIsCreate) {
                        oPayload = {
                            "tableName": "EducationalDetails",
                            "data": oModel
                        };
                        fnCall = this.ajaxCreateWithJQuery("EducationalDetails", oPayload);
                        sSuccessMessage = this.i18nModel.getText("eduDataSaved");
                    } else {
                        oPayload = {
                            "data": oModel,
                            "filters": {
                                "ID": oModel.ID
                            }
                        };
                        fnCall = this.ajaxUpdateWithJQuery("EducationalDetails", oPayload);
                        sSuccessMessage = this.i18nModel.getText("eduDataupdate");
                        this.setEduButtonsEnabled(false);
                    }
                    fnCall.then((oData) => {
                        if (oData.success) {
                            sap.ui.core.BusyIndicator.hide();
                            MessageToast.show(sSuccessMessage);
                            this.SEd_oDialog.close();
                            this.setEduButtonsEnabled(false);
                            this.byId("EdF_id_EduTable").removeSelections(true);
                            this.SS_commonEduFunction()
                            this._fetchCommonData("EducationalDetails", "sEducationModel", {
                                EmployeeID: this.EmployeeID
                            });
                        } else {
                            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                        }
                    }).catch((error) => {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                    });
                } catch (error) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            },
            AddEd_onSubmitEdDetails: function () {
                this.saveEducationDetails(true); // create mode
            },
            AddEd_onUpdateEdDetails: function () {
                this.saveEducationDetails(false); // update mode
            },

            //Education detail delete call
            EdF_DeletEdu: function () {
                var oSelectedItem = this.byId("EdF_id_EduTable").getSelectedItem();
                var sID = oSelectedItem.getBindingContext("sEducationModel").getObject().ID
                var that = this;
                var oDialog = new sap.m.Dialog({
                    title: this.i18nModel.getText("msgBoxConfirm"),
                    type: sap.m.DialogType.Message,
                    icon: "sap-icon://warning",
                    state: sap.ui.core.ValueState.Warning,
                    content: new sap.m.Text({
                        text: this.i18nModel.getText("deletConfirmation")
                    }),
                    beginButton: new sap.m.Button({
                        text: this.i18nModel.getText("OkButton"),
                        type: sap.m.ButtonType.Accept,
                        press: function () {
                            oDialog.close();
                            that.ajaxDeleteWithJQuery("/EducationalDetails", { filters: { ID: sID } }).then(() => {
                                MessageToast.show(that.i18nModel.getText("eduDataDeletSuucess"));
                                that._fetchCommonData("EducationalDetails", "sEducationModel", {
                                    EmployeeID: that.EmployeeID
                                });
                                that.setEduButtonsEnabled(false);
                            }).catch((error) => {
                                MessageToast.show(error.responseText);
                            });
                        }
                    }),
                    endButton: new sap.m.Button({
                        text: this.i18nModel.getText("CancelButton"),
                        type: sap.m.ButtonType.Reject,
                        press: function () {
                            oDialog.close();
                            that.byId("EdF_id_EduTable").removeSelections(true);
                            that.setEduButtonsEnabled(false);
                        }
                    }),
                    afterClose: function () {
                        oDialog.destroy();
                    }
                });
                oDialog.open();
            },

            //Employment detail create calls
            saveEmploymentDetails: function (bIsCreate) {
                try {
                    const isValid = utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AddEmp_id_Company"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AddEmp_id_Desig"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AddEmp_id_OfcAddress"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("AddEmp_id_StartDate"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("AddEmp_id_EndDate"), "ID") && utils._LCvalidateName(sap.ui.getCore().byId("AdEmp_id_RCNameI"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AdEmp_id_RCAddressI"), "ID") && utils._LCvalidateEmail(sap.ui.getCore().byId("AdEmp_id_RCMailI"), "ID") &&
                        utils._LCvalidateMobileNumber(sap.ui.getCore().byId("AdEmp_id_RCMobileI"), "ID") && utils._LCvalidateName(sap.ui.getCore().byId("AdEmp_id_RCNameII"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AdEmp_id_RCAddressII"), "ID") && utils._LCvalidateEmail(sap.ui.getCore().byId("AdEmp_id_RCMailII"), "ID") && utils._LCvalidateMobileNumber(sap.ui.getCore().byId("AdEmp_id_RCMobileII"), "ID");
                    if (!isValid) {
                        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                        return;
                    }
                    // Get and prepare model data
                    let oModel = this.getView().getModel("employmentModel").getData();
                    oModel.EmployeeID = this.EmployeeID;
                    oModel.Designation = sap.ui.getCore().byId("AddEmp_id_Desig").getValue() || "";
                    oModel.RCISal = sap.ui.getCore().byId("AddEmp_id_SalI").getSelectedKey() || "";
                    oModel.RCIISal = sap.ui.getCore().byId("AdEmp_id_RCSalII").getSelectedKey() || "";
                    oModel.StartDate = sap.ui.getCore().byId("AddEmp_id_StartDate").getDateValue() || "";
                    oModel.EndDate = sap.ui.getCore().byId("AddEmp_id_EndDate").getDateValue() || "";
                    oModel.StartDate = this.Formatter.convertToISODateFormat(oModel.StartDate);
                    oModel.EndDate = this.Formatter.convertToISODateFormat(oModel.EndDate);

                    let oPayload;
                    let fnCall;
                    let sSuccessMessage;

                    if (bIsCreate) {
                        oPayload = {
                            "tableName": "EmploymentDetails",
                            "data": oModel
                        };
                        fnCall = this.ajaxCreateWithJQuery("EmploymentDetails", oPayload);
                        sSuccessMessage = this.i18nModel.getText("empDataSaved");
                    } else {
                        oPayload = {
                            "data": oModel,
                            "filters": {
                                "ID": oModel.ID
                            }
                        };
                        fnCall = this.ajaxUpdateWithJQuery("EmploymentDetails", oPayload);
                        sSuccessMessage = this.i18nModel.getText("empDataupdate");
                    }
                    fnCall.then((oData) => {
                        if (oData.success) {
                            sap.ui.core.BusyIndicator.hide();
                            MessageToast.show(sSuccessMessage);
                            this.SEmp_oDialog.close();
                            this.byId("EmpF_id_EmpTable").removeSelections(true);
                            this.setEmpButtonsEnabled(false);
                            this.SS_commonEmpFunction();
                            this._fetchCommonData("EmploymentDetails", "sEmploymentModel", {
                                EmployeeID: this.EmployeeID
                            });
                            this.setEnabledByIds(["EMF_id_EmpEdit", "EMF_id_EmpDelete"], false);
                        } else {
                            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                        }
                    }).catch((error) => {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                    });

                } catch (error) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                }
            },
            AddEmp_onSubmitEmpDetails: function () {
                this.saveEmploymentDetails(true); // create mode
            },

            AddEmp_onUpdateEmpDetails: function () {
                this.saveEmploymentDetails(false); // update mode
            },
            EmpF_onSelectionChange: function (oEvent) {
                const aSelectedIndices = oEvent.getSource().getSelectedItems();
                if (aSelectedIndices.length > 0) {
                    this.setEmpButtonsEnabled(true);
                } else {
                    this.setEmpButtonsEnabled(false);
                }
            },
            EmpF_onEditEmployment: function () {
                var oSelectedItem = this.byId("EmpF_id_EmpTable").getSelectedItem();
                if (oSelectedItem) {
                    var oData = oSelectedItem.getBindingContext("sEmploymentModel").getObject();
                    this.getView().getModel("employmentModel").setData(oData);
                    this.ViewModel.setProperty("/fragmentSubmit", false);
                    this.ViewModel.setProperty("/fragmentSave", true);
                    this.SS_commonOpenDialog("SEmp_oDialog", "sap.kt.com.minihrsolution.fragment.AddEmployment", ["AddEmp_id_StartDate", "AddEmp_id_EndDate"]);
                } else {
                    MessageToast.show(this.i18nModel.getText("selectRow"));
                }
            },
            //Employment detail delete call
            EmpF_onDeletEmployment: function () {
                var oSelectedItem = this.byId("EmpF_id_EmpTable").getSelectedItem();
                var sID = oSelectedItem.getBindingContext("sEmploymentModel").getObject().ID
                var that = this;
                var oDialog = new sap.m.Dialog({
                    title: this.i18nModel.getText("msgBoxConfirm"),
                    type: sap.m.DialogType.Message,
                    icon: "sap-icon://warning",
                    state: sap.ui.core.ValueState.Warning,
                    content: new sap.m.Text({
                        text: this.i18nModel.getText("deletConfirmation")
                    }),
                    beginButton: new sap.m.Button({
                        text: this.i18nModel.getText("OkButton"),
                        type: sap.m.ButtonType.Accept,
                        press: function () {
                            oDialog.close();
                            that.ajaxDeleteWithJQuery("/EmploymentDetails", { filters: { ID: sID } }).then(() => {
                                MessageToast.show(that.i18nModel.getText("empDataDeleteSuccess"));
                                that._fetchCommonData("EmploymentDetails", "sEmploymentModel", {
                                    EmployeeID: that.EmployeeID
                                });
                                that.setEmpButtonsEnabled(false);
                            }).catch((error) => {
                                MessageToast.show(error.responseText);
                            });
                        }
                    }),
                    endButton: new sap.m.Button({
                        text: this.i18nModel.getText("CancelButton"),
                        type: sap.m.ButtonType.Reject,
                        press: function () {
                            oDialog.close();
                            that.byId("EmpF_id_EmpTable").removeSelections(true);
                            that.setEmpButtonsEnabled(false);
                        }
                    }),
                    afterClose: function () {
                        oDialog.destroy();
                    }
                });
                oDialog.open();
            },

            SS_onTabSelect: async function (oEvent) {
                if (oEvent.getParameter("key") === "educationDetailKey") {
                    this.getView().getModel("viewModel").setProperty("/isEditButtonVisible", false);
                } else if (oEvent.getParameter("key") === "employmentKey") {
                    this.getView().getModel("viewModel").setProperty("/isEditButtonVisible", false);
                } else if (oEvent.getParameter("key") === "salaryKey") {
                    this.getView().getModel("viewModel").setProperty("/isEditButtonVisible", false);
                } else if (oEvent.getParameter("key") === "paySlipKey") {
                    this.getView().getModel("viewModel").setProperty("/isEditButtonVisible", false);
                }
                else {
                    this.getView().getModel("viewModel").setProperty("/isEditButtonVisible", true);
                }
            },

            SS_onDownloadTerminateLetter: function () {
                var oEmpModel = this.getView().getModel("sEmployeeModel").getData()[0];
                var date = Formatter.formatDate(new Date());
                var empName = oEmpModel.Salutation + " " + oEmpModel.EmployeeName;
                var empDesig = oEmpModel.Designation;
                this.getView().getModel("PDFData").setProperty("/CreateDate", date);
                this.getView().getModel("PDFData").setProperty("/CertificateTitle", "TERMINATION LETTER");
                var data = `
                <div style="text-align: justify;">
                    <p>This is to formally notify that <b>${empName}</b>, has been terminated from the services of <b>Kalpavriksha Technologies</b> with effect from <b>${date}</b> due to reasons communicated during prior discussions. During their tenure as <b>${empDesig}</b>, we have reviewed the performance and discussed areas of concern in detail.</p> 
                    <p>Despite efforts to resolve these concerns, we find it necessary to discontinue the employment relationship effective immediately. Please ensure that all company assets and materials in your possession are returned by the specified date. You are reminded of your obligation to maintain confidentiality and abide by other terms of the employment agreement.</p>
                    <p>Kindly acknowledge the copy of the document for office records. We look forward to a fruitful association.</p>
                    <p>We wish you the best of luck in your future endeavors</p>
                </div>`;

                this.getView().getModel("PDFData").setProperty("/RTEText", data);
                this.SS_commonOpenDialog("SSRTE_oDialog", "sap.kt.com.minihrsolution.fragment.CommonRTE");
            },

            SS_onDownloadExperienceLetter: function () {
                var oEmpModel = this.getView().getModel("sEmployeeModel").getData()[0];
                var today = new Date();
                var date = Formatter.formatDate(today);
                var twoMonthsLater = new Date(today.setMonth(today.getMonth() + 2));
                var relievingDate = Formatter.formatDate(twoMonthsLater);
                var joiningDate = Formatter.formatDate(oEmpModel.JoiningDate);
                var empName = oEmpModel.Salutation + " " + oEmpModel.EmployeeName;
                var empID = oEmpModel.EmployeeID;
                var empDesig = oEmpModel.Designation;
                this.getView().getModel("PDFData").setProperty("/CreateDate", date);
                this.getView().getModel("PDFData").setProperty("/CertificateTitle", "RELEAVING AND EXPERIENCE LETTER");
                var data = `
                <div style="text-align: justify;">
                    <p> This is to certify that <b>${empName}</b> with Employee ID <b>${empID}</b> has worked with our company <b>Kalpavriksha Technologies</b> as a <b>${empDesig}</b> from <b>${joiningDate}</b> to <b>${date}</b>. During his tenure with us, his contributions to the organization are highly appreciated. He possesses good moral values and the right attitude</p> 
                    <p>With reference to your resignation, you stand relieved from the services of Kalpavriksha Technologies with effect from the close of working hours <b>${relievingDate}</b>. We would like you to continue to be bound by the conditions of confidentiality and other relevant terms of the employment agreement you signed with Kalpavriksha Technologies</p>
                    <p>Wishing you all the best in your future endeavors</p>
                </div>`;

                this.getView().getModel("PDFData").setProperty("/RTEText", data);
                this.SS_commonOpenDialog("SSRTE_oDialog", "sap.kt.com.minihrsolution.fragment.CommonRTE");
            },

            FCR_onDownloadPDF: function () {
                this.SSRTE_oDialog.close();
                let htmlContent = sap.ui.getCore().byId("FCR_id_RTE").getValue();
                this.generateCertificatePDF(htmlContent);
            },

            FCR_onCloseDialog: function () {
                this.SSRTE_oDialog.close();
            }

        });
    });