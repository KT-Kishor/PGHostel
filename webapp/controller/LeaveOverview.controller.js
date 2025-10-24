sap.ui.define([
    "./BaseController", // Import BaseController 
    "sap/ui/model/json/JSONModel", // JSON model for data handling
    "sap/m/MessageToast", // Import MessageToast for notifications
], function(BaseController, JSONModel, MessageToast) {
    "use strict";
    return BaseController.extend("sap.kt.com.minihrsolution.controller.LeaveOverview", {
        onInit: function() { // attach route matched
            this.getRouter().getRoute("RouteLeaveOverview").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function() {
            try {
                this.getBusyDialog();
                var LoginFUnction = await this.commonLoginFunction("LeaveOverview");
                if (!LoginFUnction) return;

                const oViewModel = new JSONModel({
                    startDate: new Date(),
                    viewKey: "Week"
                });
                this.getView().setModel(oViewModel, "viewModel");

                const loginModel = this.getOwnerComponent().getModel("LoginModel");
                this.userId = loginModel.getProperty("/EmployeeID");
                this.Type = loginModel.getProperty("/Role");
                this.currentYear = new Date().getFullYear();
                this.branch = loginModel.getProperty("/BranchCode");
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                loginModel.setProperty("/HeaderName", this.i18nModel.getText("leaveOverview"));

                let params = {
                    EmployeeStatus: "Active"
                };
                if (["Manager", "HR Manager", "Account Manager", "IT Manager"].includes(this.Type)) {
                    params.ManagerID = this.userId;
                }

                await this._fetchCommonData("EmployeeDetails", "sEmployeeDetails", params);
                await this._fetchCommonData("Leaves", "LeaveModel");

                const allLeaves = this.getView().getModel("LeaveModel").getData();
                let oEmpModel = this.getView().getModel("sEmployeeDetails");
                let employees = oEmpModel.getData();
                employees = employees.filter(e => e.Role !== "Contractor"); // exclude contractors
                oEmpModel.setData(employees);

                let filteredEmployees = [];
                if (this.Type === "Admin") {
                    filteredEmployees = employees.filter(e => e.EmployeeStatus === "Active");
                } else if (["Manager", "HR Manager", "Account Manager", "IT Manager"].includes(this.Type)) {
                    filteredEmployees = employees.filter(e => e.ManagerID === this.userId && e.EmployeeStatus === "Active");
                } else if (["Employee", "Account Consultant", "IT Consultant", "HR", "Trainee"].includes(this.Type)) {
                    const currentEmp = employees.find(e => e.EmployeeID === this.userId);
                    const currentManagerID = currentEmp ? currentEmp.ManagerID : null;
                    const currentBranch = currentEmp ? currentEmp.BranchCode : null;
                    if (currentManagerID) {
                        filteredEmployees = employees.filter(e =>
                            e.ManagerID === currentManagerID &&
                            e.EmployeeStatus === "Active" &&
                            e.BranchCode === currentBranch
                        );
                    } else {
                        filteredEmployees = employees.filter(e => e.EmployeeID === this.userId);
                    }
                }
                //  Filter leaves by only those filtered employees
                const filteredEmpIDs = filteredEmployees.map(e => e.EmployeeID);
                const filteredLeaves = allLeaves.filter(l =>
                    filteredEmpIDs.includes(l.employeeID)
                );
                const approvedLeaves = filteredLeaves.filter(l => l.status === "Approved");
                await this._preparePlanningCalendarData(filteredEmployees, approvedLeaves);
                this.initializeBirthdayCarousel();
                this.closeBusyDialog();
            } catch (error) {
                this.closeBusyDialog();
                MessageToast.show(error.message || error.responseText);
            } finally {
                this.closeBusyDialog();
            }
        },

        _preparePlanningCalendarData: function(employees, leaves) {
            const planningData = { people: [] };
            employees.forEach(employee => {
                const employeeLeaves = leaves.filter(l => l.employeeID === employee.EmployeeID);
                const employeeRow = {
                    pic: employee.ProfilePhoto ? "data:image/png;base64," + employee.ProfilePhoto : "",
                    name: employee.EmployeeID,
                    role: employee.EmployeeName || "",
                    appointments: [],
                    headers: []
                };

                employeeLeaves.forEach(leave => {
                    const startDate = new Date(leave.fromDate);
                    const endDate = new Date(leave.toDate);
                    endDate.setHours(23, 59, 59, 999);
                    const appointment = {
                        start: startDate,
                        end: endDate,
                        title: "Leave",
                        info: `Days: ${leave.NoofDays}${leave.halfDay === 'true' ? ' (Half Day)' : ''}`,
                        color: this._getAppointmentColor(leave.status),
                        tentative: leave.status === 'Approved',
                        pic: employee.ProfilePhoto ? "data:image/png;base64," + employee.ProfilePhoto : "",
                        ID: leave.ID,
                        typeOfLeave: leave.typeOfLeave,
                        status: leave.status,
                        employeeID: employee.EmployeeID
                    };
                    employeeRow.appointments.push(appointment);
                });
                planningData.people.push(employeeRow);
            });
            this.getView().setModel(new JSONModel(planningData), "PlanningModel");
        },

        handleAppointmentSelect: function(oEvent) {
            const oAppointment = oEvent.getParameter("appointment");
            if (!oAppointment) return;
            const oAppData = oAppointment.getBindingContext("PlanningModel").getObject();
            const sLeaveID = oAppData.ID;
            const sTitle = `${oAppData.typeOfLeave} - ${oAppData.status}`;
            const sInfo = oAppData.info;
            const isManager = ["Manager", "HR Manager", "Account Manager", "IT Manager"].includes(this.Type);
            const isAdmin = this.Type === "Admin";
            const aActions = isManager || isAdmin ? ["Dashboard", sap.m.MessageBox.Action.CLOSE] : [sap.m.MessageBox.Action.CLOSE];
            sap.m.MessageBox.success(
                `Leave Details: ${sTitle}\n${sInfo}`, {
                    title: "Leave Details",
                    actions: aActions,
                    emphasizedAction: "Dashboard",
                    onClose: function(sAction) {
                        if (sAction === "Dashboard" && sLeaveID && (isManager || isAdmin)) {
                            this.getOwnerComponent().setModel(
                                new sap.ui.model.json.JSONModel({
                                    from: "LeaveOverview"
                                }),
                                "NavSource"
                            );
                            this.getRouter().navTo("RouteDetailLeave", {
                                sLeaveID: sLeaveID
                            });
                        }
                    }.bind(this)
                }
            );
        },

        _getAppointmentColor: function(status) {
            switch (status) {
                case 'Approved':
                    return "#54AFE6";
                default:
                    return "#2C3587"; // Custom color
            }
        },

        onViewChange: function(oEvent) {
            const sViewKey = oEvent.getParameter("selectedItem").getKey();
            this.getView().getModel("viewModel").setProperty("/viewKey", sViewKey);
        },

        onPressback: function() {
            this.getRouter().navTo("RouteTilePage"); // Navigate to tile page
        },

        onLogout: function() {
            this.CommonLogoutFunction(); // Navigate to login page
        }
    });
});