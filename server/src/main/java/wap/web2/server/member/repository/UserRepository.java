package wap.web2.server.member.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import wap.web2.server.member.entity.Role;
import wap.web2.server.member.entity.User;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") Long id);

    Optional<User> findByEmail(String email);

    Boolean existsByEmail(String email);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
        """
        UPDATE User u SET u.role = :role WHERE u.id in :ids
        """
    )
    int updateRoleByIds(@Param("role") Role role, @Param("ids") List<Long> ids);

    @Query(
        """
        SELECT u
        FROM User u
        WHERE (:role IS NULL OR u.role = :role)
        ORDER BY u.name
        LIMIT :limit OFFSET :offset
        """
    )
    List<User> findUserByOffset(
        @Param("limit") Integer limit,
        @Param("offset") Integer offset,
        @Param("role") Role role
    );
}
