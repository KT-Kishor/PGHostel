sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "../model/formatter"],
    function (BaseController, utils, JSONModel, MessageToast, MessageBox, BusyIndicator, Formatter) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.EmployeeOffer", {
            Formatter: Formatter,
            onInit: function () {
                var oDateModel = new sap.ui.model.json.JSONModel();
                var currentDate = new Date();
                oDateModel.setData({ maxDate: currentDate, focusedDate: new Date(2000, 0, 1) });
                this.getView().setModel(oDateModel, "controller");
                this.getRouter().getRoute("RouteEmployeeOffer").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: async function (oEvent) {
                this.checkLoginModel()
                //this.commonLoginFunction("EmployeeOffer");
                BusyIndicator.show(0);
                await this._fetchCommonData("Designation", "DesignationModel", {}, ["OEF_id_SimpleForm"]);
                await this._fetchCommonData("AppVisibility", "RoleModel");
                await this._fetchCommonData("EmployeeDetailsData", "EmployeeModel");

                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.byId("EO_id_OnboardBtn").setEnabled(false);
                this.byId("EO_id_RejectBtn").setEnabled(false);
                await this._fetchCommonData("BaseLocation", "BaseLocationModel");
                this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("pageTitleemployee"));
                this.oValue = oEvent.getParameter("arguments").valueEmp;
                this.Filter = true;
                if (this.oValue === "EmployeeOffer") {
                    this.readCallForEmployeeOffer("");
                    this.EO_onPressClear();
                }
                else {
                    this.EO_onSearch();
                }
                BusyIndicator.hide();
            },
            readCallForEmployeeOffer: async function (filter) {
                await this.ajaxReadWithJQuery("EmployeeOffer", filter, ["EO_id_TableEOffer"]).then((oData) => {
                    var offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    this.getView().setModel(new JSONModel(offerData), "EmployeeOfferModel");
                    if (this.Filter) {
                        var oFilterData = [...new Map(offerData.filter(item => item.ConsultantName && item.ConsultantName.trim() !== "").map(item => [item.ConsultantName.trim(), item])).values()];
                        this.getView().setModel(new JSONModel(oFilterData), "EmployeeOfferModelInitial");
                        this.getView().getModel("EmployeeOfferModelInitial").refresh(true);
                        this.Filter = true;
                    }
                    BusyIndicator.hide();
                }).catch((oError) => {
                    BusyIndicator.hide();
                    MessageBox.error("Error while reading the employee offer details")
                })
            },
            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            onLogout: function () {
                this.getRouter().navTo("RouteLoginPage");
                this.CommonLogoutFunction();
            },
            EO_onPressEmployee: function (oEvent) {
                var oParValue, value;
                if (oEvent.getSource().getId().lastIndexOf("EO_id_AddEOffBut") !== -1) {
                    oParValue = "CreateOfferFlag"
                    value = "CreateOffer";
                } else {
                    oParValue = oEvent.getSource().getBindingContext("EmployeeOfferModel").getModel().getData()[oEvent.getSource().getBindingContextPath().split("/")[1]].ID
                    value = "UpdateOffer";
                }
                this.getRouter().navTo("RouteEmployeeOfferDetails", {
                    sParOffer: oParValue,
                    sParEmployee: value
                });
            },
            EO_onOnboardPress: async function () {
                this.onHandleEmployeeAction("OnBoarded", "onBoardEmployee");
            },
            EO_onRejectPress: function () {
                this.onHandleEmployeeAction("Rejected", "onRejectEmployee");
            },
            EO_onSearch: function () {
                var aFilterItems = this.byId("EO_id_FilterBar").getFilterGroupItems();
                var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" })
                var params = {};
                aFilterItems.forEach(function (oItem) {
                    var oControl = oItem.getControl();
                    var sValue = oItem.getName();
                    if (oControl && oControl.getValue()) {
                        if (sValue === "JoiningDate") {
                            params["startDate"] = oDateFormat.format(new Date(oControl.getValue().split('-')[0]));
                            params["endDate"] = oDateFormat.format(new Date(oControl.getValue().split('-')[1]));
                        } else {
                            params[sValue] = oControl.getValue();
                        }
                    }
                });
                if (params && Object.keys(params).length > 0) {
                    this.Filter = false;
                }
                this.readCallForEmployeeOffer(params);
                this.EO_ButtonVisibility();
            },
            // Update the status to 'Rejected' after confirmation
            onRejectEmployee: function () {
                this.updateCallForEmployeeOffer("Rejected");
                this.readCallForEmployeeOffer("");
                this.EO_ButtonVisibility();
            },
            EO_ButtonVisibility: function () {
                this.byId("EO_id_TableEOffer").removeSelections(true);
                this.byId("EO_id_OnboardBtn").setEnabled(false);
                this.byId("EO_id_RejectBtn").setEnabled(false);
            },
            EO_onPressClear: function () {
                var aFilterItems = this.byId("EO_id_FilterBar").getFilterGroupItems();
                aFilterItems.forEach(function (oItem) {
                    var oControl = oItem.getControl(); // Get the associated control
                    if (oControl) {
                        if (oControl.setValue) {
                            oControl.setValue(""); // Clear value for ComboBox, Input, DatePicker, etc.
                        }
                        if (oControl.setSelectedKey) {
                            oControl.setSelectedKey(""); // Reset selection for dropdowns
                        }
                        if (oControl.setSelected) {
                            oControl.setSelected(false); // Reset selection for Checkboxes
                        }
                    }
                });
            },
            onHandleEmployeeAction: function (status, actionMethod) {
                BusyIndicator.show(0)
                var oSelectedData = this.byId("EO_id_TableEOffer").getSelectedItem().getBindingContext("EmployeeOfferModel").getObject();
                this.oSelectedRow = oSelectedData;
                var sName = oSelectedData.Salutation + " " + oSelectedData.ConsultantName;
                var that = this;
                // Build message and title
                var sMessage = (status === "OnBoarded")
                    ? that.i18nModel.getText("confirmOnboard", [sName])
                    : that.i18nModel.getText("confirmReject", [sName]);
                var sTitle = (status === "OnBoarded")
                    ? that.i18nModel.getText("confirmTitleOnboard")
                    : that.i18nModel.getText("confirmTitleReject");
                // Call reusable confirmation dialog
                that.showConfirmationDialog(
                    sTitle,
                    sMessage,
                    function () { // onConfirm
                        if (status === "OnBoarded") {
                            const oEmployeeDetailsModel = new sap.ui.model.json.JSONModel({
                                ID: oSelectedData.ID,
                                Salutation: oSelectedData.Salutation,
                                EmployeeName: oSelectedData.ConsultantName,
                                Gender: oSelectedData.Gender,
                                JoiningDate: oSelectedData.JoiningDate.split('T')[0],
                                Role: " ",
                                DateOfBirth: "",
                                CompanyEmailID: "",
                                EmployeeEmail: oSelectedData.EmployeeEmail,
                                PermanentAddress: oSelectedData.ConsultantAddress,
                                CorrespondenceAddress: oSelectedData.ConsultantAddress,
                                BaseLocation: oSelectedData.BaseLocation,
                                AppraisalDate: oSelectedData.JoiningDate.split('T')[0],
                                Designation: oSelectedData.Designation,
                                Department: oSelectedData.Department,
                                BranchCode: oSelectedData.BranchCode,
                                MobileNo: "",
                                ManagerID: "",
                                ManagerName: "",
                                BloodGroup: "",
                                EmployeeStatus: "Active",
                                CTC: oSelectedData.CTC,
                                JoiningBonus: oSelectedData.JoiningBonus,
                                BasicSalary: oSelectedData.BasicSalary,
                                HRA: oSelectedData.HRA,
                                IncomeTax: oSelectedData.IncomeTax,
                                MedicalInsurance: oSelectedData.MedicalInsurance,
                                Gratuity: oSelectedData.Gratuity,
                                VariablePay: oSelectedData.VariablePay,
                                CostofCompany: oSelectedData.CostofCompany,
                                Total: oSelectedData.Total,
                                EmployeePF: oSelectedData.EmployeePF,
                                EmployerPF: oSelectedData.EmployerPF,
                                TotalDeduction: oSelectedData.TotalDeduction,
                                EmploymentBond: oSelectedData.EmploymentBond,
                                SpecailAllowance: oSelectedData.SpecailAllowance,
                                PT: oSelectedData.PT,
                                GrossPay: oSelectedData.GrossPay,
                                VariablePercentage: oSelectedData.VariablePercentage,
                                GrossPayMontly: oSelectedData.GrossPayMontly,
                                HikePercentage: oSelectedData.HikePercentage,
                                EffectiveDate: oSelectedData.JoiningDate.split('T')[0],
                            });
                            that.getView().setModel(oEmployeeDetailsModel, "oEmpolyeeDetailsModel");
                            that._commonFragmentOpenOffer(that, "OnboardEmployee");
                        } else {
                            that[actionMethod]();
                        }
                    },
                    function () {
                        that.EO_ButtonVisibility();
                    },
                    that.i18nModel.getText("OkButton"),
                    that.i18nModel.getText("CancelButton")
                );
            },
            _commonFragmentOpenOffer: function (name, fragmentName) {
                BusyIndicator.show(0);
                if (!this.oDialog) {
                    sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.OnboardEmployee",
                        controller: this
                    }).then(dialog => {
                        this.oDialog = dialog;
                        this.getView().addDependent(this.oDialog);
                        sap.ui.getCore().byId("OEF_id_DateofBirth").setMaxDate(new Date());
                        this._FragmentDatePickersReadOnly(["OEF_id_DateofBirth"]);
                        this.oDialog.open();
                        BusyIndicator.hide();
                    })
                } else {
                    this._FragmentDatePickersReadOnly(["OEF_id_DateofBirth"]);
                    this.oDialog.open();
                    BusyIndicator.hide();
                }
            },
            OEF_onPressClose: function () {
                const fields = ["OEF_id_CompanyMail", "OEF_id_DateofBirth", "OEF_id_Mobile"];
                fields.forEach(field => {
                    sap.ui.getCore().byId(field).setValueState("None");
                });
                this.oDialog.close();
                this.EO_ButtonVisibility();
            },
            validateDate: function (oEvent) {
                utils._LCvalidateDate(oEvent);
            },
            validateEmail: function (oEvent) {
                utils._LCvalidateEmail(oEvent);
            },
            validateMobileNo: function (oEvent) {
                utils._LCvalidateMobileNumber(oEvent);
            },
            validateCombo: function (oEvent) {
                utils._LCstrictValidationComboBox(oEvent);
            },
            OEF_onPressOnBoard: function (oEvent) {
                var oModel = this.getView().getModel("oEmpolyeeDetailsModel").getData();
                if (utils._LCvalidateEmail(sap.ui.getCore().byId("OEF_id_CompanyMail"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("OEF_id_DateofBirth"), "ID") && utils._LCvalidateMobileNumber(sap.ui.getCore().byId("OEF_id_Mobile"), "ID") && utils._LCstrictValidationComboBox(sap.ui.getCore().byId("OEF_id_Manager"), "ID")) {
                    var oPayload = {
                        tableName: "EmployeeDetails",
                        data: oModel
                    };
                    oModel.DateOfBirth = oModel.DateOfBirth.split("/").reverse().join('-');
                    oModel.ManagerID = sap.ui.getCore().byId("OEF_id_Manager").getSelectedItem().getAdditionalText();
                    this.ajaxCreateWithJQuery("EmployeeDetails", oPayload, ["OEF_id_SimpleForm"]).then((oData) => {
                        if (oData.success) {
                            MessageToast.show(this.i18nModel.getText("onBoardSuccess"));
                            this.oDialog.close();
                            this.readCallForEmployeeOffer("");
                        } else {
                            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                        }
                    }).catch((error) => {
                        BusyIndicator.hide();
                        MessageToast.show(error.message || error.responseText);
                    });
                } else {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }
            },

            updateCallForEmployeeOffer: function (oStatus) {
                this.oSelectedRow.Status = oStatus;
                var oModelOffer = {
                    "data": this.oSelectedRow,
                    "filters": {
                        "ID": this.oSelectedRow.ID
                    }
                };
                // First call for EmployeeOffer
                this.ajaxUpdateWithJQuery("EmployeeOffer", oModelOffer, ["EO_id_TableEOffer"]).then((oData) => {
                    if (oData.success) {
                        BusyIndicator.hide();
                        var sSuccessMessage = (oStatus === "OnBoarded")
                            ? this.i18nModel.getText("onBoardSuccess")
                            : this.i18nModel.getText("offerEmpReject");
                        MessageToast.show(sSuccessMessage);
                        this.oDialog.close();
                    }
                }).catch((error) => {
                    BusyIndicator.hide();
                    this.oDialog.close();
                    MessageToast.show(error.message || error.responseText);
                })
            },
            EO_onSelectionRadRowE: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("listItem");
                // If an item is selected, check the status and update button visibility accordingly
                if (oSelectedItem) {
                    var sStatus = oSelectedItem.getBindingContext("EmployeeOfferModel").getProperty("Status");
                    var isDisabled = sStatus === "OnBoarded" || sStatus === "Rejected";
                    this.byId("EO_id_OnboardBtn").setEnabled(!isDisabled);
                    this.byId("EO_id_RejectBtn").setEnabled(!isDisabled);
                }
            },
            EO_onBaseLocationChange: function (oEvent) {
                var sSelectedKey = oEvent.getSource().getSelectedKey();
                var oBaseLocationModel = this.getView().getModel("BaseLocationModel");
                var aLocations = oBaseLocationModel.getData();
                var oSelectedLocation = aLocations.find(function (loc) {
                    return loc.city === sSelectedKey;
                });
                if (oSelectedLocation) {
                    var oEmpModel = this.getView().getModel("oEmpolyeeDetailsModel");
                    oEmpModel.setProperty("/BranchCode", oSelectedLocation.branchCode);
                }
            }

        });
    });