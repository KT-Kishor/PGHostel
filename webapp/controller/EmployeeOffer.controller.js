sap.ui.define([
    "./BaseController", "../utils/validation", "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../model/formatter"],
    function (BaseController, utils, JSONModel, MessageToast, MessageBox, Formatter) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.EmployeeOffer", {
            Formatter: Formatter,
            onInit: function () {
                this.getRouter().getRoute("RouteEmployeeOffer").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function (oEvent) {
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                this.byId("EO_id_OnboardBtn").setEnabled(false);
                this.byId("EO_id_RejectBtn").setEnabled(false);
                this._fetchCommonData("BaseLocation", "BaseLocationModel");
                this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("headerEmpDetails"));
                this.oValue = oEvent.getParameter("arguments").valueEmp;
                if (this.oValue === "EmployeeOffer") {
                    this.readCallForEmployeeOffer("Initial");
                    this.EO_onPressClear();
                }
                else {
                    this.EO_onSearch();
                }
                this.byId("OEF_id_DateofBirth").setMaxDate(new Date());
            },
            readCallForEmployeeOffer: function (filter) {
                this.ajaxReadWithJQuery("EmployeeOffer", filter).then((oData) => {
                    var offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                    this.getView().setModel(new JSONModel(offerData), "EmployeeOfferModel");
                    if (filter === "Initial") {
                        offerData = [...new Map(offerData.filter(item => item.ConsultantName && item.ConsultantName.trim() !== "").map(item => [item.ConsultantName.trim(), item])).values()];
                        this.getView().setModel(new JSONModel(offerData), "EmployeeOfferModelInitial");
                    }
                    sap.ui.core.BusyIndicator.hide();
                }).catch((oError) => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error("Error while reading the employee offer details")
                })
            },
            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            onLogout: function () {
                this.getRouter().navTo("RouteLoginPage");
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
            EO_onOnboardPress: function () {
                this._fetchCommonData("Designation", "DesignationModel");
                this._fetchCommonData("AppVisibility", "RoleModel");
                this._fetchCommonData("EmployeeDetails", "EmployeeModel");
                this.onHandleEmployeeAction("OnBoarded", "onBoardEmployee");
            },
            EO_onRejectPress: function () {
                this.onHandleEmployeeAction("Rejected", "onRejectEmployee");
            },
            EO_onSearch: function () {
                var aFilterItems = this.byId("EO_id_FilterBar").getFilterGroupItems();
                var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "dd/MM/yyyy" })
                var params = {};
                aFilterItems.forEach(function (oItem) {
                    var oControl = oItem.getControl(); // Get the associated control
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
                this.readCallForEmployeeOffer(params);
            },
            // Update the status to 'Rejected' after confirmation
            onRejectEmployee: function () {
                this.updateCallForEmployeeOffer("Rejected");
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
                                JoiningDate: oSelectedData.JoiningDate,
                                Role: " ",
                                DateOfBirth: "",
                                CompanyEmailID: "",
                                EmployeeEmail: oSelectedData.EmployeeEmail,
                                PermanentAddress: oSelectedData.ConsultantAddress,
                                CorrespondenceAddress: oSelectedData.ConsultantAddress,
                                BaseLocation: oSelectedData.BaseLocation,
                                AppraisalDate: oSelectedData.JoiningDate,
                                Designation: oSelectedData.Designation,
                                BranchCode: oSelectedData.BranchCode,
                                MobileNo: "",
                                ManagerID: "",
                                ManagerName: "",
                                BloodGroup: "",
                                EmployeeStatus: "Active",
                                JoiningDate: oSelectedData.JoiningDate,
                                CTC: oSelectedData.CTC,
                                JoiningBonus: oSelectedData.JoiningBonus,
                                BasicSalary: oSelectedData.BasicSalary,
                                HRA: oSelectedData.HRA,
                                IncomeTax:oSelectedData.IncomeTax,
                                MedicalInsurance: oSelectedData.MedicalInsurance,
                                Gratuity: oSelectedData.Gratuity,
                                TotalRetires: oSelectedData.TotalRetires,
                                PerformanceBonus: oSelectedData.PerformanceBonus,
                                EngagementPB: oSelectedData.EngagementPB,
                                VariablePay: oSelectedData.VariablePay,
                                CostofCompany: oSelectedData.CostofCompany,
                                Total: oSelectedData.Total,
                                EmployeePF: oSelectedData.EmployeePF,
                                EmployerPF: oSelectedData.EmployerPF,
                                TotalDeduction: oSelectedData.TotalDeduction,
                                EmploymentBond: oSelectedData.EmploymentBond,
                                SpecailAllowance:oSelectedData.SpecailAllowance,
                                PT:oSelectedData.PT,
                                GrossPay:oSelectedData.GrossPay,
                                VariablePercentage	:oSelectedData.VariablePercentage,
                                GrossPayMontly: oSelectedData.GrossPayMontly,	
                                HikePercentage:oSelectedData.HikePercentage,
                                EffectiveDate: oSelectedData.EffectiveDate,
                            });
                            that.getView().setModel(oEmployeeDetailsModel, "oEmpolyeeDetailsModel");
                            that._commonFragmentOpenOffer(that, "OnboardEmployee");
                        } else {
                            that[actionMethod]();
                        }
                    },
                    function () {
                        that.byId("EO_id_TableEOffer").removeSelections(true);
                        that.byId("EO_id_OnboardBtn").setEnabled(false);
                        that.byId("EO_id_RejectBtn").setEnabled(false);
                    },
                    that.i18nModel.getText("OkButton"),
                    that.i18nModel.getText("CancelButton")
                );
            },
            
            _commonFragmentOpenOffer: function (name, fragmentName) {
                if (!this.oDialog) {
                    sap.ui.core.Fragment.load({
                        name: "sap.kt.com.minihrsolution.fragment.OnboardEmployee",
                        controller: this
                    }).then(dialog => {
                        this.oDialog = dialog;
                        this.getView().addDependent(this.oDialog);
                        sap.ui.getCore().byId("OEF_id_DateofBirth").setMaxDate(new Date());
                        this.oDialog.open();
                    })
                } else {
                    this.oDialog.open();
                }
            },
            OEF_onPressClose: function () {
                const fields = ["OEF_id_CompanyMail", "OEF_id_DateofBirth", "OEF_id_Mobile"];
                fields.forEach(field => {
                    sap.ui.getCore().byId(field).setValueState("None");
                });
                this.oDialog.close();
                this.byId("EO_id_TableEOffer").removeSelections(true);

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
            OEF_onPressOnBoard: function (oEvent) {
                var oModel = this.getView().getModel("oEmpolyeeDetailsModel").getData();
                oModel.DateOfBirth=oModel.DateOfBirth.split("/").reverse().join('-')
                if (utils._LCvalidateEmail(sap.ui.getCore().byId("OEF_id_CompanyMail"), "ID") && utils._LCvalidateDate(sap.ui.getCore().byId("OEF_id_DateofBirth"), "ID") && utils._LCvalidateMobileNumber(sap.ui.getCore().byId("OEF_id_Mobile"), "ID")) {
                    var oPayload = {
                        tableName: "EmployeeDetails",
                        data: oModel
                    };
                    this.ajaxCreateWithJQuery("EmployeeDetails", oPayload)
                        .then((oData) => {
                            sap.ui.core.BusyIndicator.hide();
                            if (oData.success) {
                                MessageToast.show(this.i18nModel.getText("onBoardSuccess"));
                                this.oDialog.close();
                                this.readCallForEmployeeOffer("");
                            } else {
                                MessageToast.show(this.i18nModel.getText("mandatoryFields"));
                            }
                        })
                        .catch((error) => {
                            sap.ui.core.BusyIndicator.hide();
                            MessageToast.show(this.i18nModel.getText("onboardingFailed"));
                        });
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
                this.ajaxUpdateWithJQuery("EmployeeOffer", oModelOffer).then((oData) => {
                    if (oData.success) {
                        sap.ui.core.BusyIndicator.hide();
                        var sSuccessMessage = (oStatus === "OnBoarded")
                            ? this.i18nModel.getText("onBoardSuccess")
                            : this.i18nModel.getText("offerEmpReject");
                        MessageToast.show(sSuccessMessage);
                        this.oDialog.close();
                        this.readCallForEmployeeOffer("");
                    }
                }).catch((oError) => {
                    sap.ui.core.BusyIndicator.hide();
                    this.oDialog.close();
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
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
        });
    });