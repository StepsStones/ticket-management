import asyncio
from datetime import datetime, timezone, timedelta
from app.core.database import AsyncSessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.models import (
    User, UserRole, Project, Ticket, TicketStatus, TicketPriority, TicketCategory,
    TicketTimeline, TimelineEventType, DailyUpdateStatus, TicketFollowup, FollowupType,
    DailyTicketUpdate, AuditLog
)

async def seed_data():
    print("Beginning database seed for StepsStone Ticket Management System...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with AsyncSessionLocal() as db:
        # Check if users already exist
        from sqlalchemy.future import select
        existing_user = await db.execute(select(User).limit(1))
        if existing_user.scalar_one_or_none():
            print("Database already seeded. Skipping.")
            return

        print("Creating users...")
        super_admin = User(
            email="admin@stepsstone.com",
            username="superadmin",
            full_name="StepsStone Super Administrator",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.SUPER_ADMIN,
            department="Executive Management",
            designation="Director & Administrator",
            phone="+91 98400 12345",
            is_active=True
        )
        
        legal_admin = User(
            email="legal.head@stepsstone.com",
            username="legalhead",
            full_name="Adv. K. Ramanathan",
            hashed_password=get_password_hash("legal123"),
            role=UserRole.ADMIN,
            department="Legal & Documentation",
            designation="Chief Legal Officer",
            phone="+91 98401 23456",
            is_active=True
        )
        
        employee_rajesh = User(
            email="rajesh.s@stepsstone.com",
            username="rajesh",
            full_name="Rajesh Subramanian",
            hashed_password=get_password_hash("rajesh123"),
            role=UserRole.EMPLOYEE,
            department="Legal Operations",
            designation="Senior Legal Documentation Executive",
            phone="+91 98402 34567",
            is_active=True
        )
        
        employee_priya = User(
            email="priya.k@stepsstone.com",
            username="priya",
            full_name="Priya Krishnan",
            hashed_password=get_password_hash("priya123"),
            role=UserRole.EMPLOYEE,
            department="Customer Relations",
            designation="CRM Specialist",
            phone="+91 98403 45678",
            is_active=True
        )
        
        db.add_all([super_admin, legal_admin, employee_rajesh, employee_priya])
        await db.flush()

        print("Creating StepsStone real-estate projects...")
        projects = [
            Project(
                name="Secret Aara - 01",
                code="SS-SA01",
                location="Madhavaram High Road, Chennai",
                description="Premium gated community villas and luxury residential plots in North Chennai.",
                is_active=True
            ),
            Project(
                name="Secret Aara - 02",
                code="SS-SA02",
                location="Madhavaram Extn, Chennai",
                description="Phase 2 residential enclave featuring clubhouse and CMDA approved layouts.",
                is_active=True
            ),
            Project(
                name="Vannamalai Enclave",
                code="SS-VME",
                location="Tambaram West, Chennai",
                description="Gated community residential project close to educational institutions and railway.",
                is_active=True
            ),
            Project(
                name="Urban Art",
                code="SS-UART",
                location="Perumbakkam, OMR Link Road, Chennai",
                description="Contemporary lifestyle multi-storey apartments tailored for IT professionals.",
                is_active=True
            ),
            Project(
                name="Vaanavil Plots",
                code="SS-VVP",
                location="Guduvanchery, GST Road, Chennai",
                description="Clear-titled DTCP approved villa plots with potable water and rapid appreciation.",
                is_active=True
            )
        ]
        db.add_all(projects)
        await db.flush()

        print("Creating realistic tickets...")
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        
        # Ticket 1: In Progress, Assigned to Rajesh
        t1 = Ticket(
            ticket_number="SS-TKT-2026-00001",
            customer_name="Dr. Sundaramurthy Iyer",
            customer_mobile="+91 94441 55667",
            customer_email="sundar.iyer@gmail.com",
            project_id=projects[0].id,
            unit_or_plot_number="Plot No. 42-B",
            category=TicketCategory.PATTA_CHITTA_EC_ISSUES,
            subject="Sub-Registrar Office Patta Transfer Online Status Pending",
            description=(
                "Customer Dr. Sundaramurthy registered Plot 42-B at Madhavaram SRO on 15 Oct 2026. "
                "The Patta online status still displays old owner's name. Customer requires expedited "
                "revenue department submission and field inspection clearance for bank loan subsidy."
            ),
            priority=TicketPriority.HIGH,
            status=TicketStatus.IN_PROGRESS,
            created_by_id=employee_priya.id,
            assigned_to_id=employee_rajesh.id,
            due_date=now + timedelta(days=2),
            daily_update_status=DailyUpdateStatus.SUBMITTED,
            last_daily_update_at=now - timedelta(hours=3),
            created_at=now - timedelta(days=4)
        )
        db.add(t1)
        await db.flush()

        # T1 Timeline
        db.add_all([
            TicketTimeline(
                ticket_id=t1.id,
                user_id=employee_priya.id,
                user_name=employee_priya.full_name,
                event_type=TimelineEventType.CREATED,
                title="Ticket Created",
                description="Ticket created by Priya Krishnan for customer Dr. Sundaramurthy Iyer (Secret Aara - 01).",
                created_at=now - timedelta(days=4)
            ),
            TicketTimeline(
                ticket_id=t1.id,
                user_id=legal_admin.id,
                user_name=legal_admin.full_name,
                event_type=TimelineEventType.ASSIGNED,
                title="Ticket Assigned",
                description="Assigned to Rajesh Subramanian by Adv. K. Ramanathan.",
                created_at=now - timedelta(days=3, hours=20)
            ),
            TicketTimeline(
                ticket_id=t1.id,
                user_id=employee_rajesh.id,
                user_name=employee_rajesh.full_name,
                event_type=TimelineEventType.STATUS_CHANGED,
                title="Status Changed: IN_PROGRESS",
                description="Status changed from ASSIGNED to IN_PROGRESS by Rajesh Subramanian. Remarks: Revenue inspector visit arranged.",
                created_at=now - timedelta(days=2)
            ),
            TicketTimeline(
                ticket_id=t1.id,
                user_id=employee_rajesh.id,
                user_name=employee_rajesh.full_name,
                event_type=TimelineEventType.FOLLOWUP_COMPLETED,
                title="Follow-up Update Submitted",
                description="[Internal Discussion] Revenue inspector acknowledged application receipt; inspection scheduled for Thursday.",
                created_at=now - timedelta(days=1)
            ),
            TicketTimeline(
                ticket_id=t1.id,
                user_id=employee_rajesh.id,
                user_name=employee_rajesh.full_name,
                event_type=TimelineEventType.DAILY_UPDATE_SUBMITTED,
                title="Daily Ticket Update Submitted",
                description="Progress: Submitted SRO transfer receipt to Madhavaram Taluk Office. Field verification awaited.",
                created_at=now - timedelta(hours=3)
            )
        ])

        # T1 Followup and Daily Update
        db.add(TicketFollowup(
            ticket_id=t1.id,
            user_id=employee_rajesh.id,
            followup_type=FollowupType.INTERNAL_DISCUSSION,
            description="Liaised with liaison agent at Madhavaram Taluk office. Acknowledgment slip uploaded to internal records.",
            followup_date=(now - timedelta(days=1)).strftime("%Y-%m-%d"),
            followup_time="14:30",
            next_followup_date=(now + timedelta(days=1)).strftime("%Y-%m-%d"),
            created_at=now - timedelta(days=1)
        ))
        db.add(DailyTicketUpdate(
            ticket_id=t1.id,
            user_id=employee_rajesh.id,
            update_date=now.strftime("%Y-%m-%d"),
            current_progress="Submitted SRO transfer receipt to Madhavaram Taluk Office. Village Administrative Officer sign-off in queue.",
            delay_reason="VAO on field survey duty on Monday.",
            pending_dependencies="VAO signature and zonal revenue inspector portal approval.",
            expected_resolution_date=(now + timedelta(days=2)).strftime("%Y-%m-%d"),
            next_followup_date=(now + timedelta(days=1)).strftime("%Y-%m-%d"),
            created_at=now - timedelta(hours=3)
        ))

        # Ticket 2: Unassigned Ticket (New)
        t2 = Ticket(
            ticket_number="SS-TKT-2026-00002",
            customer_name="V. Meenakshi & S. Senthil",
            customer_mobile="+91 97890 33445",
            customer_email="meenakshi.v@tcs.com",
            project_id=projects[3].id,
            unit_or_plot_number="Tower 2, Flat 604",
            category=TicketCategory.LEGAL_DOCUMENT_VERIFICATION,
            subject="SBI Home Loan Legal Scrutiny Report - Parent Document Link Verification",
            description=(
                "SBI Zonal Office panel lawyer requested certified copy of the 1996 Parent Partition Deed "
                "prior to final loan sanction for Urban Art Flat 604. Customer requests legal team to provide "
                "certified true copy and legal non-encumbrance certificate."
            ),
            priority=TicketPriority.CRITICAL,
            status=TicketStatus.OPEN,
            created_by_id=employee_priya.id,
            assigned_to_id=None,
            due_date=now + timedelta(days=1),
            daily_update_status=DailyUpdateStatus.PENDING,
            created_at=now - timedelta(hours=5)
        )
        db.add(t2)
        await db.flush()

        db.add(TicketTimeline(
            ticket_id=t2.id,
            user_id=employee_priya.id,
            user_name=employee_priya.full_name,
            event_type=TimelineEventType.CREATED,
            title="Ticket Created",
            description="Ticket created by Priya Krishnan for customer V. Meenakshi (Urban Art). Currently Unassigned.",
            created_at=now - timedelta(hours=5)
        ))

        # Ticket 3: Overdue Ticket
        t3 = Ticket(
            ticket_number="SS-TKT-2026-00003",
            customer_name="Capt. R. Narayanan (Retd)",
            customer_mobile="+91 98840 99887",
            customer_email="narayanan.retd@gmail.com",
            project_id=projects[1].id,
            unit_or_plot_number="Villa No. 12",
            category=TicketCategory.LAND_DOCUMENT_ISSUES,
            subject="Boundary Verification Discrepancy with Adjoining Revenue Survey Map",
            description=(
                "Customer states that western boundary survey stone position differs by 1.2 links from FMB sketch. "
                "Government surveyor requisition needed with private boundary marking."
            ),
            priority=TicketPriority.HIGH,
            status=TicketStatus.IN_PROGRESS,
            created_by_id=employee_rajesh.id,
            assigned_to_id=employee_rajesh.id,
            due_date=now - timedelta(days=1),  # Overdue
            daily_update_status=DailyUpdateStatus.OVERDUE,
            created_at=now - timedelta(days=6)
        )
        db.add(t3)
        await db.flush()

        db.add(TicketTimeline(
            ticket_id=t3.id,
            user_id=employee_rajesh.id,
            user_name=employee_rajesh.full_name,
            event_type=TimelineEventType.CREATED,
            title="Ticket Created",
            description="Ticket created by Rajesh Subramanian for Capt. R. Narayanan (Secret Aara - 02).",
            created_at=now - timedelta(days=6)
        ))

        # Ticket 4: Resolved Ticket
        t4 = Ticket(
            ticket_number="SS-TKT-2026-00004",
            customer_name="Karthikeyan B.",
            customer_mobile="+91 91760 11223",
            customer_email="karthik.b@cognizant.com",
            project_id=projects[2].id,
            unit_or_plot_number="Plot 18",
            category=TicketCategory.REGISTRATION_ISSUES,
            subject="Sub-Registrar Encumbrance Certificate Entry Correction Completed",
            description="Correction deed registered and EC updated reflecting zero prior claims.",
            priority=TicketPriority.MEDIUM,
            status=TicketStatus.RESOLVED,
            created_by_id=employee_priya.id,
            assigned_to_id=employee_rajesh.id,
            resolution_notes="Encumbrance Certificate with 30 years search generated and handed over to customer.",
            resolved_by_id=employee_rajesh.id,
            resolved_at=now - timedelta(hours=12),
            daily_update_status=DailyUpdateStatus.SUBMITTED,
            created_at=now - timedelta(days=8)
        )
        db.add(t4)
        await db.flush()

        db.add(TicketTimeline(
            ticket_id=t4.id,
            user_id=employee_rajesh.id,
            user_name=employee_rajesh.full_name,
            event_type=TimelineEventType.RESOLUTION_SUBMITTED,
            title="Resolution Submitted",
            description="Ticket marked as RESOLVED by Rajesh Subramanian. Resolution: Encumbrance Certificate with 30 years search generated and handed over to customer.",
            created_at=now - timedelta(hours=12)
        ))

        # Ticket 5: Closed Ticket
        t5 = Ticket(
            ticket_number="SS-TKT-2026-00005",
            customer_name="Mrs. Anitha Selvaraj",
            customer_mobile="+91 94450 77889",
            customer_email="anitha.selvaraj@yahoo.com",
            project_id=projects[4].id,
            unit_or_plot_number="Plot 7",
            category=TicketCategory.CUSTOMER_DOCUMENT_REQUEST,
            subject="Original Allotment Letter and NOC Issued",
            description="Customer requested certified copy of project NOC and Layout Approval blueprint copy.",
            priority=TicketPriority.LOW,
            status=TicketStatus.CLOSED,
            created_by_id=employee_priya.id,
            assigned_to_id=employee_priya.id,
            resolution_notes="Customer received signed NOC and approval copies via courier.",
            resolved_by_id=employee_priya.id,
            resolved_at=now - timedelta(days=3),
            closed_by_id=legal_admin.id,
            closed_at=now - timedelta(days=2),
            daily_update_status=DailyUpdateStatus.SUBMITTED,
            created_at=now - timedelta(days=12)
        )
        db.add(t5)
        await db.flush()

        db.add(TicketTimeline(
            ticket_id=t5.id,
            user_id=legal_admin.id,
            user_name=legal_admin.full_name,
            event_type=TimelineEventType.CLOSED,
            title="Ticket Closed",
            description="Ticket officially reviewed and closed by Adv. K. Ramanathan.",
            created_at=now - timedelta(days=2)
        ))

        # Audit logs
        db.add_all([
            AuditLog(
                user_id=super_admin.id,
                user_name=super_admin.full_name,
                action="SYSTEM_INIT",
                entity_type="System",
                entity_id="ROOT",
                new_value="System initial database schema provisioned and seeded.",
                ip_address="127.0.0.1"
            ),
            AuditLog(
                user_id=legal_admin.id,
                user_name=legal_admin.full_name,
                action="TICKET_ASSIGNED",
                entity_type="Ticket",
                entity_id="SS-TKT-2026-00001",
                previous_value="Unassigned",
                new_value=employee_rajesh.full_name,
                ip_address="127.0.0.1"
            )
        ])

        await db.commit()
        print("StepsStone database seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())
