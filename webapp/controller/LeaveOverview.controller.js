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
                const loginSuccess = await this.commonLoginFunction("LeaveOverview");
                if (!loginSuccess) return;
                const oViewModel = new JSONModel({
                    startDate: new Date(),
                    viewKey: "Week"
                });
                this.getView().setModel(oViewModel, "viewModel");

                // User and role info
                const loginModel = this.getOwnerComponent().getModel("LoginModel");
                this.userId = loginModel.getProperty("/EmployeeID");
                this.Type = loginModel.getProperty("/Role");
                this.currentYear = new Date().getFullYear();
                this.branch = loginModel.getProperty("/BranchCode");
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
                loginModel.setProperty("/HeaderName", this.i18nModel.getText("leaveOverview"));

                // Fetch all active employees (no manager filter)
                const params = {  EmployeeStatus: "Active" };
                await this._fetchCommonData("EmployeeDetails", "sEmployeeDetails", params);
                await this._fetchCommonData("Leaves", "LeaveModel");

                // Get data from models
                let employees = this.getView().getModel("sEmployeeDetails").getData();
                const allLeaves = this.getView().getModel("LeaveModel").getData();

                // Exclude contractors
                employees = employees.filter(e => e.Role !== "Contractor");
                this.getView().getModel("sEmployeeDetails").setData(employees);

                // Filter employees based on role
                let filteredEmployees = [];
                if (this.Type === "Admin") {
                    // Admin sees all active employees
                    filteredEmployees = employees;
                } else if (["Manager", "HR Manager", "Account Manager", "IT Manager"].includes(this.Type)) {
                    // Manager sees themselves and their team
                    filteredEmployees = employees.filter(e =>
                        e.EmployeeID === this.userId || e.ManagerID === this.userId
                    );
                } else if (["Employee", "Account Consultant", "IT Consultant", "HR", "Trainee"].includes(this.Type)) {
                    // Employee sees themselves, team under same manager, their manager
                    const currentEmp = employees.find(e => e.EmployeeID === this.userId);
                    const currentManagerID = currentEmp ? currentEmp.ManagerID : null;
                    const currentBranch = currentEmp ? currentEmp.BranchCode : null;

                    filteredEmployees = employees.filter(e =>
                        (
                            e.EmployeeID === this.userId || // self
                            (e.ManagerID === currentManagerID && e.BranchCode === currentBranch) || 
                            e.EmployeeID === currentManagerID // manager
                        )
                    );
                }
                // Filter leaves for relevant employees
                const filteredEmpIDs = filteredEmployees.map(e => e.EmployeeID);
                const filteredLeaves = allLeaves.filter(l => filteredEmpIDs.includes(l.employeeID));
                const approvedLeaves = filteredLeaves.filter(l => l.status === "Approved");
                await this._preparePlanningCalendarData(filteredEmployees, approvedLeaves);
                this.initializeBirthdayCarousel(); // Initialize birthday carousel
                this.closeBusyDialog();
            } catch (error) {
                this.closeBusyDialog();
                MessageToast.show(error.message || error.responseText);
            } finally {
                this.closeBusyDialog();
            }
        },

        _preparePlanningCalendarData: function(employees, leaves) {
            const planningData = { people: []  };

            employees.forEach(employee => {
                const employeeLeaves = leaves.filter(l => l.employeeID === employee.EmployeeID);

                const initials = (employee.EmployeeName || "").split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase(); // Generate initials if no photo

                const pic = employee.ProfilePhoto ? "data:image/png;base64," + employee.ProfilePhoto :
                    this._generateInitialsAvatar(initials); // Use profile photo or avatar image

                const employeeRow = {
                    pic: pic,
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

        _generateInitialsAvatar: function(initials) {
            const canvas = document.createElement("canvas");
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#6A6AF4"; // Circle background
            ctx.beginPath();
            ctx.arc(32, 32, 32, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = "bold 24px Arial"; // Initials
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(initials, 32, 35);
            return canvas.toDataURL("image/png");
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
                            this.getOwnerComponent().setModel(new JSONModel({ from: "LeaveOverview"
                            }), "NavSource" );
                            this.getRouter().navTo("RouteDetailLeave", {sLeaveID: sLeaveID});
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

        onPressback: function() {
            this.getRouter().navTo("RouteTilePage"); // Navigate to tile page
        },

        onLogout: function() {
            this.CommonLogoutFunction(); // Navigate to login page
        }
    });
});